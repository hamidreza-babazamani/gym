/**
 * مسیرهای مربوط به ارتباط مربی و شاگرد.
 * دلیل آپدیت: اضافه شدن مسیرهای لغو درخواست و پایان دادن به ارتباط، و اعتبارسنجی با Zod.
 */
import { Router } from "express";
import {
  listCoaches,
  requestCoach,
  respondToCoachRequest,
  cancelCoachRequest,
  endCoachStudent,
} from "../controllers/coach-student.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  requestCoachSchema,
  respondToCoachRequestSchema,
  endCoachStudentSchema,
} from "../validations/coach-student.validation";

const router = Router();

// فقط شاگرد می‌تواند فهرست مربیان فعال را مشاهده کند
router.get(
  "/coaches",
  authMiddleware,
  requireRole("STUDENT"),
  listCoaches
);

// فقط شاگرد می‌تواند درخواست مربی ارسال کند
router.post(
  "/coaches/:coachId/request",
  authMiddleware,
  requireRole("STUDENT"),
  validate(requestCoachSchema),
  requestCoach
);

// فقط مربی می‌تواند درخواست‌های خودش را بررسی کند
router.patch(
  "/coach-requests/:requestId",
  authMiddleware,
  requireRole("COACH"),
  validate(respondToCoachRequestSchema),
  respondToCoachRequest
);

// لغو درخواست توسط شاگرد (قبل از تأیید)
router.patch(
  "/coach-requests/:requestId/cancel",
  authMiddleware,
  requireRole("STUDENT"),
  cancelCoachRequest
);

// پایان دادن به ارتباط فعال (توسط مربی یا شاگرد)
router.patch(
  "/coach-students/:id/end",
  authMiddleware,
  validate(endCoachStudentSchema),
  endCoachStudent
);

export default router;