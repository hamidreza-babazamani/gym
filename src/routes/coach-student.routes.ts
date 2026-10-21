
import { Router } from "express";
import {
  listCoaches,
  requestCoach,
  respondToCoachRequest,
} from "../controllers/coach-student.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";

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
  requestCoach
);

// فقط مربی می‌تواند درخواست‌های خودش را بررسی کند
router.patch(
  "/coach-requests/:requestId",
  authMiddleware,
  requireRole("COACH"),
  respondToCoachRequest
);

export default router;
