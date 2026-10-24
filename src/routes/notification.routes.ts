/**
 * مسیرهای مربوط به مدیریت اعلان‌ها.
 * دلیل استفاده: تعریف Endpointهای مشاهده و علامت‌گذاری اعلان‌ها.
 */
import { Router } from "express";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller";
import authMiddleware from "../middlewares/auth.middleware";

const router = Router();

// دریافت لیست اعلان‌ها
router.get("/", authMiddleware, listNotifications);

// دریافت تعداد اعلان‌های خوانده‌نشده
router.get("/unread-count", authMiddleware, getUnreadCount);

// علامت‌گذاری همه به عنوان خوانده‌شده
router.patch("/read-all", authMiddleware, markAllAsRead);

// علامت‌گذاری یک اعلان به عنوان خوانده‌شده
router.patch("/:id/read", authMiddleware, markAsRead);

export default router;