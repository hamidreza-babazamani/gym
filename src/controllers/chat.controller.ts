/**
 * کنترلرهای مدیریت چت.
 * دلیل اصلاح: به‌روزرسانی updatedAt مکالمه موجود.
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

  // جستجوی مکالمه خصوصی موجود
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
    // به‌روزرسانی updatedAt برای نمایش در بالای لیست
    await prisma.conversation.update({
      where: { id: existing.id },
      data: { updatedAt: new Date() },
    });
    return sendSuccess(res, "مکالمه از قبل وجود دارد.", { conversation: existing });
  }

  // ایجاد مکالمه جدید
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

// دریافت لیست مکالمات
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

  const conversationsWithUnreadCount = await Promise.all(
    conversations.map(async (conv) => {
      const member = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: conv.id, userId } },
        select: { lastReadAt: true },
      });

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          ...(member?.lastReadAt ? { createdAt: { gt: member.lastReadAt } } : {}),
          NOT: { senderId: userId },
        },
      });

      return { ...conv, unreadCount };
    })
  );

  return sendSuccess(res, "لیست مکالمات دریافت شد.", { conversations: conversationsWithUnreadCount });
});

// دریافت تاریخچه پیام‌ها
export const getConversationMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = String(req.params.id);
  const userId = req.user!.id;
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member || member.leftAt) throw new ApiError(403, "شما به این مکالمه دسترسی ندارید.");

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, fullName: true } },
      file: { select: { id: true, originalName: true, path: true, mimeType: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });

  return sendSuccess(res, "تاریخچه پیام‌ها دریافت شد.", { 
    messages: messages.reverse(),
    nextCursor,
  });
});