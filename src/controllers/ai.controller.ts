/**
 * کنترلرهای دستیار هوش مصنوعی.
 * دلیل اصلاح: اضافه کردن صفحه‌بندی به تاریخچه مکالمات.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { generateAIResponse } from "../services/ai.service";

// چت با دستیار AI
export const chatWithAI = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { message } = req.body;

  // ۱. جمع‌آوری اطلاعات مجاز کاربر (آخرین لاگ‌های پیشرفت)
  const recentLogs = await prisma.progressLog.findMany({
    where: { userId },
    orderBy: { recordedAt: "desc" },
    take: 3,
  });

  const context = recentLogs.length > 0
    ? recentLogs.map(log => `وزن: ${log.weight || "ثبت نشده"}`).join(", ")
    : "اطلاعات پیشرفتی ثبت نشده است.";

  try {
    // ۲. دریافت پاسخ از AI (قبل از ذخیره، تا اگر خطا داد چیزی ذخیره نشه)
    const aiResponse = await generateAIResponse(message, context);

    // ۳. ذخیره پیام کاربر و پاسخ AI در یک تراکنش (برای حفظ یکپارچگی)
    await prisma.$transaction([
      prisma.aIConversation.create({
        data: { userId, role: "user", content: message },
      }),
      prisma.aIConversation.create({
        data: { userId, role: "assistant", content: aiResponse },
      }),
    ]);

    return sendSuccess(res, "پاسخ دریافت شد.", { response: aiResponse });
  } catch (error) {
    // اگر AI خطا داد، هیچ چیز توی دیتابیس ذخیره نمی‌شه (چون تراکنش انجام نشده)
    throw error;
  }
});

// دریافت تاریخچه مکالمات AI (با صفحه‌بندی)
export const getAIConversationHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const conversations = await prisma.aIConversation.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = conversations.length === limit ? conversations[conversations.length - 1].id : null;

  return sendSuccess(res, "تاریخچه مکالمات دریافت شد.", { 
    conversations: conversations.reverse(), // برای نمایش به ترتیب زمانی صعودی
    nextCursor,
  });
});