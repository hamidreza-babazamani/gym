/**
 * مسیرهای مربوط به برنامه‌های تمرینی.
 * دلیل آپدیت: اضافه شدن مسیر اختصاص دسته‌ای برنامه به چند ورزشکار.
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
  listProgramVersions,
  revertProgramToVersion,
  updateProgramDay,
  deleteProgramDay,
  updateProgram,
  deleteProgram,
  assignProgramBulk,
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
  updateProgramDaySchema,
  updateProgramSchema,
  assignProgramBulkSchema,
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

// ویرایش یک برنامه
router.patch(
  "/:id",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(updateProgramSchema),
  updateProgram
);

// حذف یک برنامه
router.delete(
  "/:id",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  deleteProgram
);

// اضافه کردن روز به برنامه
router.post(
  "/:programId/days",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(addDaySchema),
  addDay
);

// ویرایش یک روز تمرینی
router.patch(
  "/days/:id",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(updateProgramDaySchema),
  updateProgramDay
);

// حذف یک روز تمرینی
router.delete(
  "/days/:id",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  deleteProgramDay
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

// اختصاص دسته‌ای برنامه به چند ورزشکار
router.post(
  "/:programId/assign-bulk",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  validate(assignProgramBulkSchema),
  assignProgramBulk
);

// ثبت اجرای واقعی تمرین (توسط ورزشکار)
router.post(
  "/log",
  authMiddleware,
  requireRole("STUDENT"),
  validate(logExerciseSchema),
  logExercise
);

// دریافت لیست نسخه‌های یک برنامه
router.get(
  "/:programId/versions",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  listProgramVersions
);

// بازگردانی برنامه به یک نسخه قبلی
router.post(
  "/:programId/versions/:versionId/revert",
  authMiddleware,
  requireRole("COACH", "ADMIN", "SUPER_ADMIN"),
  revertProgramToVersion
);

export default router;