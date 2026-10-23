/**
 * مسیرهای مربوط به مدیریت رشته‌های ورزشی.
 * دلیل استفاده: تعریف Endpointها و اعمال سطح دسترسی (فقط ادمین‌ها می‌توانند تغییر ایجاد کنند).
 */
import { Router } from "express";
import {
  listSports,
  getSport,
  createSport,
  updateSport,
  deleteSport,
} from "../controllers/sport.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createSportSchema, updateSportSchema } from "../validations/sport.validation";

const router = Router();

// مشاهده لیست و جزئیات رشته‌ها (برای همه کاربران لاگین‌شده)
router.get("/", authMiddleware, listSports);
router.get("/:id", authMiddleware, getSport);

// ایجاد، ویرایش و حذف (فقط برای ادمین و سوپر ادمین)
router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate(createSportSchema),
  createSport
);

router.patch(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate(updateSportSchema),
  updateSport
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  deleteSport
);

export default router;