/**
 * کنترلرهای مدیریت اعلان‌ها.
 * دلیل اصلاح نهایی: حل قطعی باگ پاکسازی pendingNotificationKeys و مدیریت خطا.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { queue } from "../utils/queue";
import { NotificationType } from "../../generated/prisma/client";
import { logger } from "../config/logger";

// مجموعه‌ای برای جلوگیری از اضافه شدن کارهای تکراری به صف
const pendingNotificationKeys = new Set<string>();

// تابع کمکی برای ایجاد اعلان
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: any
) => {
  const jobKey = `${userId}-${type}-${title}`;

  // ۱. جلوگیری از اضافه شدن کار تکراری به صف
  if (pendingNotificationKeys.has(jobKey)) {
    logger.info(`Notification job already pending: ${jobKey}`);
    return;
  }

  pendingNotificationKeys.add(jobKey);

  // ۲. اضافه کردن کار به صف
  queue.add(
    "create-notification",
    { userId, type, title, body, data, jobKey },
    async (payload) => {
      try {
        // ۳. جلوگیری از اعلان تکراری در دیتابیس (در ۵ دقیقه اخیر)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existing = await prisma.notification.findFirst({
          where: {
            userId: payload.userId,
            type: payload.type,
            title: payload.title,
            createdAt: { gte: fiveMinutesAgo },
          },
        });

        if (existing) {
          logger.info(`Duplicate notification skipped: ${payload.jobKey}`);
          return;
        }

        await prisma.notification.create({
          data: {
            userId: payload.userId,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            data: payload.data || null,
          },
        });

        logger.info(`Notification created: ${payload.jobKey}`);
      } catch (error) {
        logger.error(`Error creating notification (${payload.jobKey}): ${error}`);
        throw error; // پرتاب خطا برای Retry در صف
      } finally {
        // ۴. پاکسازی کلید از مجموعه pending (در هر صورت)
        pendingNotificationKeys.delete(payload.jobKey);
      }
    }
  );
};

// دریافت لیست اعلان‌های کاربر
export const listNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { unreadOnly } = req.query;

  const notifications = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly === "true" ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return sendSuccess(res, "لیست اعلان‌ها دریافت شد.", { notifications });
});

// دریافت تعداد اعلان‌های خوانده‌نشده
export const getUnreadCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const count = await prisma.notification.count({ where: { userId, isRead: false } });
  return sendSuccess(res, "تعداد اعلان‌های خوانده‌نشده دریافت شد.", { count });
});

// علامت‌گذاری یک اعلان به عنوان خوانده‌شده
export const markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const userId = req.user!.id;

  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw new ApiError(404, "اعلان پیدا نشد.");

  await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });

  return sendSuccess(res, "اعلان به عنوان خوانده‌شده علامت‌گذاری شد.");
});

// علامت‌گذاری همه اعلان‌ها به عنوان خوانده‌شده
export const markAllAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return sendSuccess(res, "همه اعلان‌ها به عنوان خوانده‌شده علامت‌گذاری شدند.");
});