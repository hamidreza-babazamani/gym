/**
 * کنترلرهای مدیریت ارتباط مربی و شاگرد.
 * دلیل بازنویسی: اضافه شدن اعلان برای درخواست مربی.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { createNotification } from "./notification.controller";

// ارسال درخواست شاگرد برای پیوستن به مربی
export const requestCoach = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const coachId = String(req.params.coachId);
  const studentId = req.user?.id;
  const { sportId } = req.body;

  if (!studentId) throw new ApiError(401, "ابتدا وارد حساب کاربری شوید.");
  if (coachId === studentId) throw new ApiError(400, "شناسه مربی معتبر نیست.");

  const coach = await prisma.user.findFirst({
    where: { id: coachId, status: "ACTIVE", roles: { some: { role: "COACH" } } },
    select: { id: true },
  });
  if (!coach) throw new ApiError(404, "مربی موردنظر پیدا نشد.");

  const sport = await prisma.sport.findUnique({
    where: { id: sportId }, select: { id: true, isActive: true },
  });
  if (!sport || !sport.isActive) throw new ApiError(400, "رشته ورزشی نامعتبر یا غیرفعال است.");

  // F-07 fix: Check for existing relationship (including terminal states)
  const existing = await prisma.coachStudent.findUnique({
    where: {
      coachId_studentId_sportId: { coachId, studentId, sportId },
    },
  });

  let request;

  if (existing) {
    // If active or pending, block
    if (existing.status === "PENDING" || existing.status === "ACTIVE") {
      throw new ApiError(409, "شما قبلاً برای این مربی و رشته درخواست داده‌اید یا ارتباط فعال دارید.");
    }
    // If terminal state (REJECTED, CANCELLED, ENDED), reactivate as PENDING
    request = await prisma.coachStudent.update({
      where: { id: existing.id },
      data: { status: "PENDING", initiatedBy: "STUDENT", startedAt: null, endedAt: null },
    });
  } else {
    // Create new request
    request = await prisma.coachStudent.create({
      data: { coachId, studentId, sportId, initiatedBy: "STUDENT", status: "PENDING" },
    });
  }

  await createNotification(
    coachId,
    "COACH_REQUEST",
    "درخواست مربی جدید",
    "درخواست همکاری جدید از طرف یک ورزشکار دریافت شد.",
    { requestId: request.id }
  );

  return sendSuccess(res, "درخواست شما برای مربی ارسال شد.", {
    requestId: request.id, status: request.status,
  }, 201);
});

// تأیید یا رد درخواست شاگرد توسط مربی
export const respondToCoachRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = String(req.params.requestId);
  const coachId = req.user?.id;
  const { decision } = req.body;

  if (!coachId) throw new ApiError(401, "ابتدا وارد حساب کاربری شوید.");

  const request = await prisma.coachStudent.findFirst({
    where: { id: requestId, coachId, status: "PENDING" },
    select: { id: true, studentId: true },
  });
  if (!request) throw new ApiError(404, "درخواست پیدا نشد یا قبلاً بررسی شده است.");

  // F-06 fix: Atomic update to prevent race conditions
  const updatedRequest = await prisma.coachStudent.updateMany({
    where: { id: request.id, status: "PENDING" },
    data: {
      status: decision === "APPROVE" ? "ACTIVE" : "REJECTED",
      ...(decision === "APPROVE" ? { startedAt: new Date() } : {}),
    },
  });

  if (updatedRequest.count === 0) {
    throw new ApiError(409, "وضعیت این درخواست هم‌اکنون توسط کاربر دیگری تغییر کرده است.");
  }

  await createNotification(
    request.studentId,
    "COACH_REQUEST_RESPONSE",
    decision === "APPROVE" ? "درخواست شما تأیید شد" : "درخواست شما رد شد",
    decision === "APPROVE" ? "مربی درخواست همکاری شما را پذیرفت." : "مربی درخواست همکاری شما را رد کرد.",
    { requestId: request.id, status: decision === "APPROVE" ? "ACTIVE" : "REJECTED" }
  );

  return sendSuccess(res, decision === "APPROVE" ? "درخواست شاگرد تأیید شد." : "درخواست شاگرد رد شد.", {
    requestId: request.id, status: decision === "APPROVE" ? "ACTIVE" : "REJECTED",
  });
});

// لغو درخواست توسط شاگرد
export const cancelCoachRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = String(req.params.requestId);
  const studentId = req.user?.id;

  if (!studentId) throw new ApiError(401, "ابتدا وارد حساب کاربری شوید.");

  // F-06 fix: Atomic update to prevent overwriting a concurrent approval
  const updatedRequest = await prisma.coachStudent.updateMany({
    where: { id: requestId, studentId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  if (updatedRequest.count === 0) {
    throw new ApiError(404, "درخواست پیدا نشد یا قابل لغو نیست.");
  }

  return sendSuccess(res, "درخواست شما لغو شد.");
});

export const endCoachStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const relationId = String(req.params.id);
  const userId = req.user?.id;
  const { reason } = req.body;

  if (!userId) throw new ApiError(401, "ابتدا وارد حساب کاربری شوید.");

  const relation = await prisma.coachStudent.findFirst({
    where: { id: relationId, status: "ACTIVE", OR: [{ coachId: userId }, { studentId: userId }] },
    select: { id: true },
  });
  if (!relation) throw new ApiError(404, "ارتباط پیدا نشد یا قابل پایان نیست.");

  await prisma.coachStudent.update({
    where: { id: relation.id },
    data: {
      status: "ENDED",
      endedAt: new Date(),
      endedReason: reason || null,
      leftAt: new Date(), // ← اضافه شد
    },
  });

  return sendSuccess(res, "ارتباط با موفقیت پایان یافت.");
});

// دریافت فهرست مربیان فعال
export const listCoaches = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, "ابتدا وارد حساب کاربری شوید.");

  const coaches = await prisma.user.findMany({
    where: { status: "ACTIVE", roles: { some: { role: "COACH" } } },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return sendSuccess(res, "فهرست مربیان فعال دریافت شد.", { coaches, count: coaches.length });
});