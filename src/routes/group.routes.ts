/**
 * مسیرهای مربوط به مدیریت گروه‌ها.
 * دلیل استفاده: تعریف Endpointها و اعمال سطح دسترسی (فقط مربی).
 */
import { Router } from "express";
import {
  createGroup,
  listGroups,
  getGroup,
  updateGroup,
  addMember,
  removeMember,
} from "../controllers/group.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createGroupSchema, updateGroupSchema, addMemberSchema } from "../validations/group.validation";

const router = Router();

// ایجاد گروه جدید (فقط مربی)
router.post(
  "/",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(createGroupSchema),
  createGroup
);

// دریافت لیست گروه‌ها (فقط مربی)
router.get(
  "/",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  listGroups
);

// دریافت جزئیات یک گروه (فقط مربی)
router.get(
  "/:id",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  getGroup
);

// ویرایش گروه (فقط مربی)
router.patch(
  "/:id",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(updateGroupSchema),
  updateGroup
);

// افزودن عضو به گروه (فقط مربی)
router.post(
  "/:id/members",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(addMemberSchema),
  addMember
);

// حذف عضو از گروه (فقط مربی)
router.delete(
  "/:id/members/:userId",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  removeMember
);

export default router;