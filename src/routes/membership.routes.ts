/**
 * مسیرهای مربوط به مدیریت عضویت‌ها.
 * دلیل استفاده: تعریف Endpointها و اعمال سطح دسترسی.
 */
import { Router } from "express";
import {
  createMembership,
  listMemberships,
  getMembership,
  updateMembership,
  cancelMembership,
} from "../controllers/membership.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createMembershipSchema, updateMembershipSchema } from "../validations/membership.validation";

const router = Router();

// مشاهده لیست عضویت‌ها (کاربران لاگین‌شده)
router.get("/", authMiddleware, listMemberships);

// مشاهده جزئیات یک عضویت (کاربران لاگین‌شده)
router.get("/:id", authMiddleware, getMembership);

// ایجاد عضویت (فقط ادمین و سوپر ادمین)
router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate(createMembershipSchema),
  createMembership
);

// ویرایش عضویت (فقط ادمین و سوپر ادمین)
router.patch(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate(updateMembershipSchema),
  updateMembership
);

// لغو عضویت (فقط ادمین و سوپر ادمین)
router.patch(
  "/:id/cancel",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  cancelMembership
);

export default router;