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

  const existing = await prisma.coachStudent.findFirst({
    where: { coachId, studentId, sportId, status: { in: ["PENDING", "ACTIVE"] } },
  });
  if (existing) throw new ApiError(409, "شما قبلاً برای این مربی و رشته درخواست داده‌اید یا ارتباط فعال دارید.");

  const request = await prisma.coachStudent.create({
    data: { coachId, studentId, sportId, initiatedBy: "STUDENT", status: "PENDING" },
  });

  // ارسال اعلان به مربی
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

  const updatedRequest = await prisma.coachStudent.update({
    where: { id: request.id },
    data: {
      status: decision === "APPROVE" ? "ACTIVE" : "REJECTED",
      ...(decision === "APPROVE" ? { startedAt: new Date() } : {}),
    },
  });

  // ارسال اعلان به شاگرد
  await createNotification(
    request.studentId,
    "COACH_REQUEST_RESPONSE",
    decision === "APPROVE" ? "درخواست شما تأیید شد" : "درخواست شما رد شد",
    decision === "APPROVE" ? "مربی درخواست همکاری شما را پذیرفت." : "مربی درخواست همکاری شما را رد کرد.",
    { requestId: updatedRequest.id, status: updatedRequest.status }
  );

  return sendSuccess(res, decision === "APPROVE" ? "درخواست شاگرد تأیید شد." : "درخواست شاگرد رد شد.", {
    requestId: updatedRequest.id, status: updatedRequest.status,
  });
});

// لغو درخواست توسط شاگرد
export const cancelCoachRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = String(req.params.requestId);
  const studentId = req.user?.id;

  if (!studentId) throw new ApiError(401, "ابتدا وارد حساب کاربری شوید.");

  const request = await prisma.coachStudent.findFirst({
    where: { id: requestId, studentId, status: "PENDING" }, select: { id: true },
  });
  if (!request) throw new ApiError(404, "درخواست پیدا نشد یا قابل لغو نیست.");

  await prisma.coachStudent.update({ where: { id: request.id }, data: { status: "CANCELLED" } });

  return sendSuccess(res, "درخواست شما لغو شد.");
});

// پایان دادن به ارتباط فعال
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
    data: { status: "ENDED", endedAt: new Date(), endedReason: reason || null },
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