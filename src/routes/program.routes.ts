/**
 * مسیرهای مربوط به برنامه‌های تمرینی.
 * دلیل آپدیت: اضافه شدن مسیرهای ویرایش/حذف تمرین و ثبت اجرای آن.
 */
import { Router } from "express";
import {
  createExercise,
  createProgram,
  addDay,
  addExerciseToDay,
  getProgram,
  assignProgram,
  updateProgramExercise,
  deleteProgramExercise,
  logExercise,
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
  updateProgramExerciseSchema,
  logExerciseSchema,
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

// ویرایش تمرین در برنامه
router.patch(
  "/exercises/:id",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(updateProgramExerciseSchema),
  updateProgramExercise
);

// حذف تمرین از برنامه
router.delete(
  "/exercises/:id",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  deleteProgramExercise
);

// اختصاص برنامه به ورزشکار
router.post(
  "/:programId/assign",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(assignProgramSchema),
  assignProgram
);

// ثبت اجرای واقعی تمرین (توسط ورزشکار)
router.post(
  "/log",
  authMiddleware,
  requireRole("STUDENT"),
  validate(logExerciseSchema),
  logExercise
);

export default router;