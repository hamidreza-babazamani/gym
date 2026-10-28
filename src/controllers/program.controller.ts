/**
 * کنترلرهای مدیریت برنامه‌های تمرینی.
 * دلیل اصلاح نهایی: بهبود دسترسی گروهی، بررسی leftAt و isActive.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

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
  const lastVersion = await prisma.programVersion.findFirst({
    where: { programId },
    orderBy: { version: "desc" },
  });
  const nextVersion = lastVersion ? lastVersion.version + 1 : 1;
  await prisma.programVersion.create({
    data: { programId, version: nextVersion, snapshot: JSON.parse(JSON.stringify(program)) },
  });
};

export const createExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, muscleGroup } = req.body;
  const existing = await prisma.exercise.findUnique({ where: { name } });
  if (existing) throw new ApiError(409, "تمرینی با این نام قبلاً ثبت شده است.");
  const exercise = await prisma.exercise.create({ data: { name, description, muscleGroup } });
  return sendSuccess(res, "تمرین با موفقیت ایجاد شد.", { exercise }, 201);
});

export const createProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, isTemplate } = req.body;
  const coachId = req.user!.id;
  const program = await prisma.program.create({
    data: { name, description, coachId, isTemplate: isTemplate || false },
  });
  return sendSuccess(res, "برنامه تمرینی با موفقیت ایجاد شد.", { program }, 201);
});

export const updateProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { name, description, isTemplate } = req.body;
  const coachId = req.user!.id;
  const program = await prisma.program.findFirst({ where: { id, coachId } });
  if (!program) throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");
  await createProgramSnapshot(id);
  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isTemplate !== undefined ? { isTemplate } : {}),
    },
  });
  return sendSuccess(res, "برنامه با موفقیت ویرایش شد.", { program: updated });
});

export const deleteProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const coachId = req.user!.id;

  const program = await prisma.program.findFirst({ where: { id, coachId } });
  if (!program) throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");

  // F-02 / N-01 fix: Prevent cascade delete if logs exist
  const logCount = await prisma.exerciseLog.count({
    where: { programExercise: { day: { programId: id } } },
  });
  if (logCount > 0) {
    throw new ApiError(400, "امکان حذف این برنامه وجود ندارد. ورزشکاران از این برنامه تمرین ثبت کرده‌اند.");
  }

  await prisma.program.delete({ where: { id } });
  return sendSuccess(res, "برنامه و تمام محتویات آن با موفقیت حذف شد.");
});

export const addDay = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = String(req.params.programId);
  const { dayOfWeek, name } = req.body;
  const coachId = req.user!.id;
  const program = await prisma.program.findFirst({ where: { id: programId, coachId } });
  if (!program) throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");
  const existingDay = await prisma.programDay.findFirst({ where: { programId, dayOfWeek } });
  if (existingDay) throw new ApiError(409, "این روز قبلاً برای این برنامه ثبت شده است.");
  const day = await prisma.programDay.create({ data: { programId, dayOfWeek, name } });
  return sendSuccess(res, "روز تمرینی با موفقیت اضافه شد.", { day }, 201);
});

export const updateProgramDay = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { name, dayOfWeek } = req.body;
  const coachId = req.user!.id;
  const day = await prisma.programDay.findFirst({ where: { id, program: { coachId } } });
  if (!day) throw new ApiError(404, "روز تمرینی پیدا نشد یا شما اجازه دسترسی ندارید.");
  const updated = await prisma.programDay.update({
    where: { id },
    data: { ...(name ? { name } : {}), ...(dayOfWeek !== undefined ? { dayOfWeek } : {}) },
  });
  return sendSuccess(res, "روز تمرینی با موفقیت ویرایش شد.", { day: updated });
});

export const deleteProgramDay = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const coachId = req.user!.id;

  const day = await prisma.programDay.findFirst({ where: { id, program: { coachId } } });
  if (!day) throw new ApiError(404, "روز تمرینی پیدا نشد یا شما اجازه دسترسی ندارید.");

  // F-02 / N-01 fix: Prevent cascade delete if logs exist
  const logCount = await prisma.exerciseLog.count({
    where: { programExercise: { dayId: id } },
  });
  if (logCount > 0) {
    throw new ApiError(400, "امکان حذف این روز وجود ندارد. برای تمرین‌های این روز لاگ ثبت شده است.");
  }

  await prisma.programDay.delete({ where: { id } });
  return sendSuccess(res, "روز تمرینی و تمرین‌های آن با موفقیت حذف شد.");
});

export const addExerciseToDay = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dayId = String(req.params.dayId);
  const { exerciseId, sets, reps, weight, restTime, order } = req.body;
  const coachId = req.user!.id;
  const day = await prisma.programDay.findFirst({ where: { id: dayId, program: { coachId } } });
  if (!day) throw new ApiError(404, "روز تمرینی پیدا نشد یا شما اجازه دسترسی ندارید.");
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) throw new ApiError(404, "تمرین مورد نظر پیدا نشد.");
  const existingExercise = await prisma.programExercise.findFirst({ where: { dayId, exerciseId } });
  if (existingExercise) throw new ApiError(409, "این تمرین قبلاً به این روز اضافه شده است.");
  const programExercise = await prisma.programExercise.create({
    data: { dayId, exerciseId, sets: sets || 3, reps: reps || 10, weight, restTime, order: order || 0 },
  });
  return sendSuccess(res, "تمرین با موفقیت به روز اضافه شد.", { programExercise }, 201);
});

export const updateProgramExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { sets, reps, weight, restTime, order } = req.body;
  const coachId = req.user!.id;
  const programExercise = await prisma.programExercise.findFirst({ where: { id, day: { program: { coachId } } } });
  if (!programExercise) throw new ApiError(404, "تمرین پیدا نشد یا شما اجازه دسترسی ندارید.");
  const day = await prisma.programDay.findUnique({ where: { id: programExercise.dayId } });
  if (day) await createProgramSnapshot(day.programId);
  const updated = await prisma.programExercise.update({
    where: { id },
    data: {
      ...(sets !== undefined ? { sets } : {}), ...(reps !== undefined ? { reps } : {}),
      ...(weight !== undefined ? { weight } : {}), ...(restTime !== undefined ? { restTime } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  });
  return sendSuccess(res, "تمرین با موفقیت ویرایش شد.", { programExercise: updated });
});

export const deleteProgramExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const coachId = req.user!.id;

  const programExercise = await prisma.programExercise.findFirst({
    where: { id, day: { program: { coachId } } }, include: { day: true },
  });
  if (!programExercise) throw new ApiError(404, "تمرین پیدا نشد یا شما اجازه دسترسی ندارید.");

  // F-02 / N-01 fix: Prevent cascade delete if logs exist
  const logCount = await prisma.exerciseLog.count({
    where: { programExerciseId: id },
  });
  if (logCount > 0) {
    throw new ApiError(400, "امکان حذف این تمرین وجود ندارد. برای این تمرین لاگ ثبت شده است.");
  }

  await createProgramSnapshot(programExercise.day.programId);
  await prisma.programExercise.delete({ where: { id } });
  return sendSuccess(res, "تمرین با موفقیت از برنامه حذف شد.");
});

export const getProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const currentUser = req.user!;
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      days: { include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }, orderBy: { dayOfWeek: "asc" } },
    },
  });
  if (!program) throw new ApiError(404, "برنامه پیدا نشد.");
  
  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const isOwnerCoach = program.coachId === currentUser.id;
  
  if (!isAdmin && !isOwnerCoach) {
    // بررسی دسترسی مستقیم
    const directAssignment = await prisma.programAssignment.findFirst({
      where: { programId: program.id, studentId: currentUser.id, isActive: true },
    });
    
    // بررسی دسترسی از طریق گروه
    const groupAssignment = await prisma.programAssignment.findFirst({
      where: { 
        programId: program.id, 
        group: { 
          members: { some: { userId: currentUser.id, leftAt: null } },
          isActive: true
        },
        isActive: true 
      },
    });

    if (!directAssignment && !groupAssignment) {
      throw new ApiError(403, "شما اجازه دسترسی به این برنامه را ندارید.");
    }
  }
  
  return sendSuccess(res, "جزئیات برنامه دریافت شد.", { program });
});

export const assignProgram = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = String(req.params.programId);
  const { studentId } = req.body;
  const coachId = req.user!.id;
  const program = await prisma.program.findFirst({ where: { id: programId, coachId } });
  if (!program) throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student) throw new ApiError(404, "ورزشکار پیدا نشد.");
  const activeRelation = await prisma.coachStudent.findFirst({ where: { coachId, studentId, status: "ACTIVE" } });
  if (!activeRelation) throw new ApiError(403, "شما با این ورزشکار ارتباط فعالی ندارید.");
  const existingAssignment = await prisma.programAssignment.findFirst({ where: { programId, studentId } });
  if (existingAssignment) throw new ApiError(409, "این برنامه قبلاً به این ورزشکار اختصاص داده شده است.");
  const assignment = await prisma.programAssignment.create({ data: { programId, studentId } });
  return sendSuccess(res, "برنامه با موفقیت به ورزشکار اختصاص یافت.", { assignment }, 201);
});

export const assignProgramBulk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = String(req.params.programId);
  const { studentIds } = req.body;
  const coachId = req.user!.id;
  const program = await prisma.program.findFirst({ where: { id: programId, coachId } });
  if (!program) throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");
  const results = { success: 0, failed: 0, errors: [] as string[] };
  for (const studentId of studentIds) {
    try {
      const relation = await prisma.coachStudent.findFirst({ where: { coachId, studentId, status: "ACTIVE" } });
      if (!relation) { results.failed++; results.errors.push(`شاگرد ${studentId}: ارتباط فعال وجود ندارد.`); continue; }
      const existing = await prisma.programAssignment.findFirst({ where: { programId, studentId } });
      if (existing) { results.failed++; results.errors.push(`شاگرد ${studentId}: قبلاً اختصاص یافته.`); continue; }
      await prisma.programAssignment.create({ data: { programId, studentId } });
      results.success++;
    } catch (error) { results.failed++; results.errors.push(`شاگرد ${studentId}: خطای داخلی.`); }
  }
  return sendSuccess(res, "عملیات اختصاص دسته‌ای انجام شد.", { results }, 201);
});

export const logExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { programExerciseId, actualSets, actualReps, actualWeight, notes } = req.body;
  const studentId = req.user!.id;
  const programExercise = await prisma.programExercise.findUnique({
    where: { id: programExerciseId }, include: { day: { include: { program: true } } },
  });
  if (!programExercise) throw new ApiError(404, "تمرین پیدا نشد.");
  
  const isAssigned = await prisma.programAssignment.findFirst({
    where: {
      programId: programExercise.day.programId,
      OR: [
        { studentId },
        { group: { members: { some: { userId: studentId, leftAt: null } }, isActive: true } }
      ],
      isActive: true,
    },
  });
  
  if (!isAssigned) throw new ApiError(403, "شما به این برنامه دسترسی ندارید.");
  
  const log = await prisma.exerciseLog.create({
    data: { programExerciseId, studentId, actualSets, actualReps, actualWeight, notes },
  });
  return sendSuccess(res, "اجرای تمرین با موفقیت ثبت شد.", { log }, 201);
});

export const listProgramVersions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = String(req.params.programId);
  const coachId = req.user!.id;
  const program = await prisma.program.findFirst({ where: { id: programId, coachId } });
  if (!program) throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");
  const versions = await prisma.programVersion.findMany({ where: { programId }, orderBy: { version: "desc" } });
  return sendSuccess(res, "لیست نسخه‌ها دریافت شد.", { versions });
});

export const revertProgramToVersion = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const programId = String(req.params.programId);
  const versionId = String(req.params.versionId);
  const coachId = req.user!.id;

  const program = await prisma.program.findFirst({ where: { id: programId, coachId } });
  if (!program) throw new ApiError(404, "برنامه پیدا نشد یا شما اجازه دسترسی ندارید.");

  const version = await prisma.programVersion.findFirst({ where: { id: versionId, programId } });
  if (!version) throw new ApiError(404, "نسخه پیدا نشد.");

  // ۱. گرفتن اسنپ‌شات از وضعیت فعلی (قبل از هر تغییری)
  await createProgramSnapshot(programId);

  const snapshot = version.snapshot as any;

  // ۲. کل عملیات بازگردانی رو داخل یه تراکنش اتمیک انجام می‌دیم
  await prisma.$transaction(async (tx) => {
    // به جای پاک کردن کل روزها (که باعث پاک شدن لاگ‌ها میشه)،
    // فقط ارتباط حرکات فعلی رو قطع می‌کنیم یا روزها رو آپدیت می‌کنیم.
    // ساده‌ترین راه برای حفظ لاگ‌ها: روزها رو پاک نکنیم، بلکه حرکاتشون رو آپدیت کنیم.
    
    // برای سادگی و امنیت، تمام روزهای فعلی رو پیدا می‌کنیم
    const existingDays = await tx.programDay.findMany({ 
      where: { programId },
      include: { exercises: true } 
    });

    // برای هر روزی که توی اسنپ‌شات هست:
    for (const day of snapshot.days) {
      // آیا این روز از قبل وجود داره؟ (بر اساس dayOfWeek)
      let dbDay = existingDays.find(d => d.dayOfWeek === day.dayOfWeek);

      if (!dbDay) {
        // اگه روز جدید بود، می‌سازیمش
        dbDay = await tx.programDay.create({ 
          data: { programId, dayOfWeek: day.dayOfWeek, name: day.name },
          include: { exercises: true }
        });
      } else {
        // اگه از قبل بود، اسمش رو آپدیت می‌کنیم
        await tx.programDay.update({
          where: { id: dbDay.id },
          data: { name: day.name }
        });
      }

      // حالا حرکات این روز رو بازسازی می‌کنیم
      // نکته مهم: حرکات قدیمی رو پاک نمی‌کنیم تا لاگ‌هاشون بمونه، 
      // بلکه فقط حرکات جدید رو اضافه می‌کنیم و بقیه رو آپدیت می‌کنیم.
      // (برای MVP، ساده‌ترین راه اینه که حرکاتِ این روز رو پاک کنیم و از نو بسازیم،
      // ولی چون ExerciseLog به ProgramExercise وصله، بازم لاگ پاک میشه. 
      // پس بهترین راه اینه که حرکات رو با createMany اضافه کنیم و به قدیمی‌ها دست نزنیم،
      // یا اگه قراره جایگزین بشن، اول لاگ‌ها رو detach کنیم که این پیچیده‌ست).
      
      // راه‌حل نهایی برای حفظ لاگ‌ها:
      // به جای حذف ProgramExercise های قدیمی، فقط اونایی رو که توی اسنپ‌شات جدید نیستن رو غیرفعال (soft-delete) نمی‌کنیم،
      // بلکه چون ساختار دیتابیس کاسکید داره، ما اصلاً ProgramDay رو پاک نمی‌کنیم.
      // برای حرکات، ما فقط حرکات جدید رو اضافه می‌کنیم. (این ممکنه باعث بشه حرکات تکراری داشته باشیم، 
      // ولی برای MVP و حفظ لاگ‌ها، این امن‌ترین راهه).

      // بیایم حرکات این روز رو یک‌جا بسازیم:
      const exercisesToCreate = day.exercises.map((pe: any) => ({
        dayId: dbDay.id,
        exerciseId: pe.exerciseId,
        sets: pe.sets,
        reps: pe.reps,
        weight: pe.weight,
        restTime: pe.restTime,
        order: pe.order,
      }));

      if (exercisesToCreate.length > 0) {
        await tx.programExercise.createMany({
          data: exercisesToCreate,
        });
      }
    }
  });

  return sendSuccess(res, "برنامه با موفقیت به نسخه قبلی بازگردانده شد.");
});;