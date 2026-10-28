/**
 * کنترلرهای مدیریت پیشرفت و گزارش‌ها.
 * دلیل اصلاح: استفاده از leftAt در بررسی ارتباط و اضافه کردن include به createProgressNote.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// تابع کمکی برای بررسی اینکه آیا مربی با ورزشکار ارتباط فعال دارد
const isCoachOfStudent = async (coachId: string, studentId: string) => {
  const relation = await prisma.coachStudent.findFirst({
    where: { coachId, studentId, status: "ACTIVE", leftAt: null },
  });
  return !!relation;
};

// ثبت لاگ جدید پیشرفت (با بررسی تکراری بودن در یک روز)
export const createProgressLog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { weight, bodyFat, chest, waist, hips, arms, legs, notes } = req.body;

  // بررسی اینکه آیا امروز لاگی ثبت شده یا نه
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingLog = await prisma.progressLog.findFirst({
    where: {
      userId,
      recordedAt: { gte: today, lt: tomorrow },
    },
  });

  if (existingLog) {
    // اگر امروز لاگ ثبت شده، همون رو آپدیت کن
    const updated = await prisma.progressLog.update({
      where: { id: existingLog.id },
      data: {
        weight: weight ?? existingLog.weight,
        bodyFat: bodyFat ?? existingLog.bodyFat,
        chest: chest ?? existingLog.chest,
        waist: waist ?? existingLog.waist,
        hips: hips ?? existingLog.hips,
        arms: arms ?? existingLog.arms,
        legs: legs ?? existingLog.legs,
        notes: notes ?? existingLog.notes,
      },
    });
    return sendSuccess(res, "لاگ امروز به‌روزرسانی شد.", { log: updated }, 200);
  }

  // اگر امروز لاگ ثبت نشده، لاگ جدید بساز
  const log = await prisma.progressLog.create({
    data: {
      userId,
      weight: weight ?? null,
      bodyFat: bodyFat ?? null,
      chest: chest ?? null,
      waist: waist ?? null,
      hips: hips ?? null,
      arms: arms ?? null,
      legs: legs ?? null,
      notes: notes ?? null,
    },
  });

  return sendSuccess(res, "لاگ پیشرفت با موفقیت ثبت شد.", { log }, 201);
});

// دریافت تاریخچه لاگ‌های پیشرفت
export const listProgressLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.query.userId || req.user!.id);
  const currentUser = req.user!;
  const { from, to } = req.query;

  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const isOwner = userId === currentUser.id;
  
  if (!isAdmin && !isOwner) {
    const hasAccess = await isCoachOfStudent(currentUser.id, userId);
    if (!hasAccess) throw new ApiError(403, "شما به این اطلاعات دسترسی ندارید.");
  }

  const logs = await prisma.progressLog.findMany({
    where: {
      userId,
      recordedAt: {
        ...(from ? { gte: new Date(String(from)) } : {}),
        ...(to ? { lte: new Date(String(to)) } : {}),
      },
    },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    take: 100,
  });

  return sendSuccess(res, "تاریخچه پیشرفت دریافت شد.", { logs });
});

// حذف یک لاگ پیشرفت
export const deleteProgressLog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const userId = req.user!.id;

  const log = await prisma.progressLog.findUnique({ where: { id } });
  if (!log) throw new ApiError(404, "لاگ پیدا نشد.");

  const isAdmin = req.user!.roles.includes("ADMIN") || req.user!.roles.includes("SUPER_ADMIN");
  if (log.userId !== userId && !isAdmin) throw new ApiError(403, "شما اجازه حذف این لاگ را ندارید.");

  await prisma.progressLog.delete({ where: { id } });
  return sendSuccess(res, "لاگ با موفقیت حذف شد.");
});

// ثبت یادداشت مربی برای ورزشکار
export const createProgressNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const coachId = req.user!.id;
  const { studentId, content } = req.body;

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student) throw new ApiError(404, "ورزشکار پیدا نشد.");

  const hasAccess = await isCoachOfStudent(coachId, studentId);
  if (!hasAccess) throw new ApiError(403, "شما با این ورزشکار ارتباط فعالی ندارید.");

  const note = await prisma.progressNote.create({
    data: { coachId, studentId, content },
    include: { coach: { select: { id: true, fullName: true } } },
  });

  return sendSuccess(res, "یادداشت با موفقیت ثبت شد.", { note }, 201);
});

// دریافت یادداشت‌های یک ورزشکار
export const listProgressNotes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const studentId = String(req.query.studentId || req.user!.id);
  const currentUser = req.user!;

  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const isOwner = studentId === currentUser.id;

  if (!isAdmin && !isOwner) {
    const hasAccess = await isCoachOfStudent(currentUser.id, studentId);
    if (!hasAccess) throw new ApiError(403, "شما به این اطلاعات دسترسی ندارید.");
  }

  const notes = await prisma.progressNote.findMany({
    where: { studentId },
    include: { coach: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return sendSuccess(res, "یادداشت‌ها دریافت شد.", { notes });
});

// مقایسه پیشرفت (با بررسی صحت بازه زمانی)
export const compareProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.query.userId || req.user!.id);
  const currentUser = req.user!;
  const { from, to } = req.query;

  if (!from || !to) throw new ApiError(400, "تاریخ شروع و پایان الزامی است.");

  // بررسی اینکه تاریخ شروع از تاریخ پایان بزرگ‌تر نباشد
  const fromDate = new Date(String(from));
  const toDate = new Date(String(to));
  if (fromDate > toDate) {
    throw new ApiError(400, "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.");
  }

  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const isOwner = userId === currentUser.id;
  if (!isAdmin && !isOwner) {
    const hasAccess = await isCoachOfStudent(currentUser.id, userId);
    if (!hasAccess) throw new ApiError(403, "شما به این اطلاعات دسترسی ندارید.");
  }

    const startLog = await prisma.progressLog.findFirst({
    where: { userId, recordedAt: { gte: fromDate, lte: toDate } },
    orderBy: { recordedAt: "asc" },
  });

  const endLog = await prisma.progressLog.findFirst({
    where: { userId, recordedAt: { gte: fromDate, lte: toDate } },
    orderBy: { recordedAt: "desc" },
  });

  if (!startLog || !endLog) {
    return sendSuccess(res, "برای مقایسه، حداقل دو لاگ در بازه مشخص شده نیاز است.", { comparison: null });
  }

  const diff = (a: number | null, b: number | null) => (a !== null && b !== null) ? b - a : null;

  const comparison = {
    weightChange: diff(startLog.weight, endLog.weight),
    bodyFatChange: diff(startLog.bodyFat, endLog.bodyFat),
    chestChange: diff(startLog.chest, endLog.chest),
    waistChange: diff(startLog.waist, endLog.waist),
    armsChange: diff(startLog.arms, endLog.arms),
    legsChange: diff(startLog.legs, endLog.legs),
    startDate: startLog.recordedAt,
    endDate: endLog.recordedAt,
  };

  return sendSuccess(res, "مقایسه پیشرفت انجام شد.", { comparison });
});