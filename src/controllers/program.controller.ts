/**
 * کنترلرهای مدیریت برنامه‌های تمرینی.
 * دلیل اصلاح: جلوگیری از خطاهای 500 ناشی از درخواست‌های تکراری و اعمال کنترل ارتباط مربی-شاگرد.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// ساخت تمرین جدید (فقط مربی و ادمین)
export const createExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, muscleGroup } = req.body;

  const existing = await prisma.exercise.findUnique({ where: { name } });
  if (existing) {
    throw new ApiError(409, "تمرینی با این نام قبلاً ثبت شده است.");
  }

  const exercise = await prisma.exercise.create({
    data: { name, description, muscleGroup },
  });

  return sendSuccess(res, "تمرین با موفقیت ایجاد شد.", { exercise }, 201);
});

// ساخت برنامه جدید (فقط مربی)
export const createProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, isTemplate } = req.body;
  const coachId = req.user!.id;

  const program = await prisma.program.create({
    data: {
      name,
      description,
      coachId,
      isTemplate: isTemplate || false,
    },
  });

  return sendSuccess(res, "برنامه تمرینی با موفقیت ایجاد شد.", { program }, 201);
});

// اضافه کردن روز به برنامه
export const addDay = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = String(req.params.programId);
  const { dayOfWeek, name } = req.body;
  const coachId = req.user!.id;

  const program = await prisma.program.findFirst({
    where: { id: programId, coachId },
  });

  if (!program) {
    throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  // بررسی تکراری نبودن روز در این برنامه
  const existingDay = await prisma.programDay.findFirst({
    where: { programId, dayOfWeek },
  });

  if (existingDay) {
    throw new ApiError(409, "این روز قبلاً برای این برنامه ثبت شده است.");
  }

  const day = await prisma.programDay.create({
    data: { programId, dayOfWeek, name },
  });

  return sendSuccess(res, "روز تمرینی با موفقیت اضافه شد.", { day }, 201);
});

// اضافه کردن تمرین به روز
export const addExerciseToDay = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dayId = String(req.params.dayId);
  const { exerciseId, sets, reps, weight, restTime, order } = req.body;
  const coachId = req.user!.id;

  const day = await prisma.programDay.findFirst({
    where: { id: dayId, program: { coachId } },
  });

  if (!day) {
    throw new ApiError(404, "روز تمرینی پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) {
    throw new ApiError(404, "تمرین مورد نظر پیدا نشد.");
  }

  // بررسی اینکه آیا این تمرین قبلاً در این روز ثبت شده یا نه
  const existingExercise = await prisma.programExercise.findFirst({
    where: { dayId, exerciseId },
  });

  if (existingExercise) {
    throw new ApiError(409, "این تمرین قبلاً به این روز اضافه شده است.");
  }

  const programExercise = await prisma.programExercise.create({
    data: {
      dayId,
      exerciseId,
      sets: sets || 3,
      reps: reps || 10,
      weight,
      restTime,
      order: order || 0,
    },
  });

  return sendSuccess(res, "تمرین با موفقیت به روز اضافه شد.", { programExercise }, 201);
});

// دریافت جزئیات یک برنامه (با کنترل دسترسی)
export const getProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const currentUser = req.user!;

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      days: {
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  if (!program) {
    throw new ApiError(404, "برنامه پیدا نشد.");
  }

  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const isOwnerCoach = program.coachId === currentUser.id;
  
  // اگر ادمین یا صاحب برنامه نیست، بررسی کن که آیا برنامه به این شاگرد اختصاص داده شده یا نه
  if (!isAdmin && !isOwnerCoach) {
    const assignment = await prisma.programAssignment.findFirst({
      where: {
        programId: program.id,
        studentId: currentUser.id,
        isActive: true,
      },
    });

    if (!assignment) {
      throw new ApiError(403, "شما اجازه دسترسی به این برنامه را ندارید.");
    }
  }

  return sendSuccess(res, "جزئیات برنامه دریافت شد.", { program });
});

// اختصاص برنامه به ورزشکار
export const assignProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = String(req.params.programId);
  const { studentId } = req.body;
  const coachId = req.user!.id;

  const program = await prisma.program.findFirst({
    where: { id: programId, coachId },
  });

  if (!program) {
    throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student) {
    throw new ApiError(404, "ورزشکار پیدا نشد.");
  }

  // بررسی اینکه آیا این مربی با این شاگرد ارتباط فعال دارد یا نه
  const activeRelation = await prisma.coachStudent.findFirst({
    where: {
      coachId,
      studentId,
      status: "ACTIVE",
    },
  });

  if (!activeRelation) {
    throw new ApiError(403, "شما با این ورزشکار ارتباط فعالی ندارید.");
  }

  // بررسی اینکه آیا قبلاً این برنامه به این شاگرد اختصاص داده شده یا نه
  const existingAssignment = await prisma.programAssignment.findFirst({
    where: { programId, studentId },
  });

  if (existingAssignment) {
    throw new ApiError(409, "این برنامه قبلاً به این ورزشکار اختصاص داده شده است.");
  }

  const assignment = await prisma.programAssignment.create({
    data: { programId, studentId },
  });

  return sendSuccess(res, "برنامه با موفقیت به ورزشکار اختصاص یافت.", { assignment }, 201);
});
// تابع کمکی برای گرفتن نسخه پشتیبان از برنامه
const createProgramSnapshot = async (programId: string) => {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      days: {
        include: { exercises: { include: { exercise: true } } },
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  if (!program) return;

  // پیدا کردن آخرین نسخه
  const lastVersion = await prisma.programVersion.findFirst({
    where: { programId },
    orderBy: { version: "desc" },
  });

  const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

  await prisma.programVersion.create({
    data: {
      programId,
      version: nextVersion,
      snapshot: JSON.parse(JSON.stringify(program)),
    },
  });
};
// ویرایش یک تمرین در برنامه (با نسخه‌بندی)
export const updateProgramExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { sets, reps, weight, restTime, order } = req.body;
  const coachId = req.user!.id;

  // بررسی اینکه این تمرین متعلق به برنامه‌های این مربی است
  const programExercise = await prisma.programExercise.findFirst({
    where: { id, day: { program: { coachId } } },
  });

  if (!programExercise) {
    throw new ApiError(404, "تمرین پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  // گرفتن نسخه پشتیبان قبل از تغییر
  await createProgramSnapshot(programExercise.dayId ? (await prisma.programDay.findUnique({ where: { id: programExercise.dayId } }))!.programId : "");

  const updated = await prisma.programExercise.update({
    where: { id },
    data: {
      ...(sets !== undefined ? { sets } : {}),
      ...(reps !== undefined ? { reps } : {}),
      ...(weight !== undefined ? { weight } : {}),
      ...(restTime !== undefined ? { restTime } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });

  return sendSuccess(res, "تمرین با موفقیت ویرایش شد.", { programExercise: updated });
});

// حذف یک تمرین از برنامه (با نسخه‌بندی)
export const deleteProgramExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const coachId = req.user!.id;

  const programExercise = await prisma.programExercise.findFirst({
    where: { id, day: { program: { coachId } } },
    include: { day: true },
  });

  if (!programExercise) {
    throw new ApiError(404, "تمرین پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  // گرفتن نسخه پشتیبان قبل از حذف
  await createProgramSnapshot(programExercise.day.programId);

  await prisma.programExercise.delete({ where: { id } });

  return sendSuccess(res, "تمرین با موفقیت از برنامه حذف شد.");
});

// ثبت اجرای واقعی تمرین توسط ورزشکار
export const logExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { programExerciseId, actualSets, actualReps, actualWeight, notes } = req.body;
  const studentId = req.user!.id;

  // بررسی اینکه این تمرین وجود دارد
  const programExercise = await prisma.programExercise.findUnique({
    where: { id: programExerciseId },
    include: { day: { include: { program: true } } },
  });

  if (!programExercise) {
    throw new ApiError(404, "تمرین پیدا نشد.");
  }

  // بررسی اینکه آیا این برنامه به این شاگرد اختصاص داده شده یا نه
  const isAssigned = await prisma.programAssignment.findFirst({
    where: {
      programId: programExercise.day.programId,
      OR: [
        { studentId },
        { group: { members: { some: { userId: studentId, leftAt: null } } } },
      ],
      isActive: true,
    },
  });

  if (!isAssigned) {
    throw new ApiError(403, "شما به این برنامه دسترسی ندارید.");
  }

  const log = await prisma.exerciseLog.create({
    data: {
      programExerciseId,
      studentId,
      actualSets,
      actualReps,
      actualWeight,
      notes,
    },
  });

  return sendSuccess(res, "اجرای تمرین با موفقیت ثبت شد.", { log }, 201);
});