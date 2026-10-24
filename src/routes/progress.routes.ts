/**
 * مسیرهای مربوط به مدیریت پیشرفت و گزارش‌ها.
 * دلیل استفاده: تعریف Endpointهای ثبت لاگ، یادداشت مربی و مقایسه پیشرفت.
 */
import { Router } from "express";
import {
  createProgressLog,
  listProgressLogs,
  deleteProgressLog,
  createProgressNote,
  listProgressNotes,
  compareProgress,
} from "../controllers/progress.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createProgressLogSchema,
  createProgressNoteSchema,
} from "../validations/progress.validation";

const router = Router();

// ثبت لاگ پیشرفت (وزن و اندازه‌ها) توسط خود ورزشکار
router.post("/logs", authMiddleware, validate(createProgressLogSchema), createProgressLog);

// دریافت تاریخچه لاگ‌های پیشرفت (با فیلتر بازه زمانی و کاربر)
router.get("/logs", authMiddleware, listProgressLogs);

// حذف یک لاگ پیشرفت
router.delete("/logs/:id", authMiddleware, deleteProgressLog);

// ثبت یادداشت مربی برای ورزشکار (فقط مربی)
router.post(
  "/notes",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(createProgressNoteSchema),
  createProgressNote
);

// دریافت یادداشت‌های یک ورزشکار
router.get("/notes", authMiddleware, listProgressNotes);

// مقایسه پیشرفت در دو بازه زمانی
router.get("/compare", authMiddleware, compareProgress);

export default router;