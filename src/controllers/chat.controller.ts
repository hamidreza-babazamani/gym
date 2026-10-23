/**
 * کنترلرهای مدیریت چت.
 * دلیل اصلاح نهایی: حل قطعی باگ تکرار مکالمه خصوصی و اصلاح منطق صفحه‌بندی پیام‌ها.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// ایجاد مکالمه خصوصی
export const createPrivateConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { recipientId } = req.body;
  const userId = req.user!.id;

  if (recipientId === userId) throw new ApiError(400, "نمی‌توانید با خودتان مکالمه ایجاد کنید.");

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) throw new ApiError(404, "کاربر پیدا نشد.");

  // ۱. جستجوی مکالمه خصوصی موجود (فقط با دو عضو فعال)
  const existing = await prisma.conversation.findFirst({
    where: {
      type: "PRIVATE",
      AND: [
        { members: { some: { userId, leftAt: null } } },
        { members: { some: { userId: recipientId, leftAt: null } } },
      ],
    },
  });

  if (existing) {
    return sendSuccess(res, "مکالمه از قبل وجود دارد.", { conversation: existing });
  }

  // ۲. ایجاد مکالمه جدید
  const conversation = await prisma.conversation.create({
    data: {
      type: "PRIVATE",
      members: { create: [{ userId }, { userId: recipientId }] },
    },
  });

  return sendSuccess(res, "مکالمه با موفقیت ایجاد شد.", { conversation }, 201);
});

// ایجاد مکالمه گروهی
export const createGroupConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, memberIds } = req.body;
  const userId = req.user!.id;

  const allMemberIds = Array.from(new Set([...memberIds, userId]));

  const users = await prisma.user.findMany({ where: { id: { in: allMemberIds } } });
  if (users.length !== allMemberIds.length) throw new ApiError(404, "یکی از کاربران پیدا نشد.");

  const conversation = await prisma.conversation.create({
    data: {
      type: "GROUP",
      title,
      members: { create: allMemberIds.map(id => ({ userId: id })) },
    },
  });

  return sendSuccess(res, "گروه با موفقیت ایجاد شد.", { conversation }, 201);
});

// دریافت لیست مکالمات کاربر (با شمارش پیام‌های خوانده‌نشده)
export const listConversations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const conversations = await prisma.conversation.findMany({
    where: { members: { some: { userId, leftAt: null } } },
    include: {
      members: {
        where: { leftAt: null },
        include: { user: { select: { id: true, fullName: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // محاسبه تعداد پیام‌های خوانده‌نشده برای هر مکالمه
  const conversationsWithUnreadCount = await Promise.all(
    conversations.map(async (conv) => {
      // پیدا کردن اطلاعات عضویت کاربر در این مکالمه
      const member = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: conv.id, userId } },
        select: { lastReadAt: true },
      });

      // شمارش پیام‌های جدیدتر از lastReadAt (یا همه پیام‌ها اگر lastReadAt null باشد)
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          ...(member?.lastReadAt ? { createdAt: { gt: member.lastReadAt } } : {}),
          NOT: { senderId: userId }, // پیام‌های خود کاربر رو نشمار
        },
      });

      return { ...conv, unreadCount };
    })
  );

  return sendSuccess(res, "لیست مکالمات دریافت شد.", { conversations: conversationsWithUnreadCount });
});

// دریافت تاریخچه پیام‌ها (با صفحه‌بندی صحیح)
export const getConversationMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = String(req.params.id);
  const userId = req.user!.id;
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member || member.leftAt) throw new ApiError(403, "شما به این مکالمه دسترسی ندارید.");

  // دریافت پیام‌ها به ترتیب نزولی (جدیدترین به قدیمی‌ترین)
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, fullName: true } },
      file: { select: { id: true, originalName: true, path: true, mimeType: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  // تنظیم cursor برای صفحه بعدی (بر اساس آخرین پیام لیست نزولی)
  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

  // علامت‌گذاری به عنوان خوانده‌شده
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });

  return sendSuccess(res, "تاریخچه پیام‌ها دریافت شد.", { 
    messages: messages.reverse(), // برگرداندن به ترتیب صعودی برای نمایش
    nextCursor,
  });
});