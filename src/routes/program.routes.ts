/**
 * مسیرهای مربوط به برنامه‌های تمرینی.
 * دلیل استفاده: تعریف Endpointها و اعمال سطح دسترسی (فقط مربی و ادمین).
 */
import { Router } from "express";
import {
  createExercise,
  createProgram,
  addDay,
  addExerciseToDay,
  getProgram,
  assignProgram,
} from "../controllers/program.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createExerciseSchema,
  createProgramSchema,
  addDaySchema,
  addExerciseToDaySchema,
  assignProgramSchema,
} from "../validations/program.validation";

const router = Router();

// ساخت تمرین جدید
router.post(
  "/exercises",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(createExerciseSchema),
  createExercise
);

// ساخت برنامه جدید
router.post(
  "/",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(createProgramSchema),
  createProgram
);

// مشاهده جزئیات یک برنامه
router.get("/:id", authMiddleware, getProgram);

// اضافه کردن روز به برنامه
router.post(
  "/:programId/days",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(addDaySchema),
  addDay
);

// اضافه کردن تمرین به روز
router.post(
  "/days/:dayId/exercises",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(addExerciseToDaySchema),
  addExerciseToDay
);

// اختصاص برنامه به ورزشکار
router.post(
  "/:programId/assign",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(assignProgramSchema),
  assignProgram
);

export default router;