/**
 * مسیرهای مدیریتی (فقط ادمین و Super Admin).
 * دلیل اصلاح: محدودسازی listUsers و listAuditLogs به Super Admin برای امنیت بیشتر.
 */
import { Router } from "express";
import {
  promoteToCoach,
  listUsers,
  updateUserStatus,
  financialReport,
  statsReport,
  listAuditLogs,
} from "../controllers/admin.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";

const router = Router();

// احراز هویت برای تمام مسیرها
router.use(authMiddleware);

// مدیریت کاربران (ادمین و Super Admin)
router.get("/users", requireRole("ADMIN", "SUPER_ADMIN"), listUsers);
router.patch("/users/:userId/status", requireRole("ADMIN", "SUPER_ADMIN"), updateUserStatus);
router.patch("/users/:userId/promote-to-coach", requireRole("SUPER_ADMIN"), promoteToCoach);

// گزارش‌ها (ادمین و Super Admin)
router.get("/reports/financial", requireRole("ADMIN", "SUPER_ADMIN"), financialReport);
router.get("/reports/stats", requireRole("ADMIN", "SUPER_ADMIN"), statsReport);

// تاریخچه عملیات (فقط Super Admin)
router.get("/audit-logs", requireRole("SUPER_ADMIN"), listAuditLogs);

export default router;