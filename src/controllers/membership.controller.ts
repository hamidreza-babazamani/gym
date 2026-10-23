/**
 * کنترلرهای مدیریت عضویت‌ها.
 * دلیل آپدیت: اضافه شدن تشخیص خودکار عضویت‌های منقضی‌شده در زمان واکشی.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { expireOldMemberships } from "../utils/membership.utils";
import { MembershipStatus } from "../../generated/prisma/client";

// ایجاد عضویت جدید (توسط ادمین)
export const createMembership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId, sportId, startsAt, endsAt } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "کاربر پیدا نشد.");
  }

  const sport = await prisma.sport.findUnique({ where: { id: sportId } });
  if (!sport) {
    throw new ApiError(404, "رشته ورزشی پیدا نشد.");
  }

  const existing = await prisma.membership.findFirst({
    where: { userId, sportId, status: "ACTIVE" },
  });

  if (existing) {
    throw new ApiError(409, "کاربر از قبل عضویت فعالی در این رشته دارد.");
  }

  const membership = await prisma.membership.create({
    data: {
      userId,
      sportId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      status: "ACTIVE",
    },
  });

  return sendSuccess(res, "عضویت با موفقیت ایجاد شد.", { membership }, 201);
});

// دریافت لیست عضویت‌ها (با کنترل دسترسی و تشخیص انقضا)
export const listMemberships = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId, sportId, status } = req.query;
  const currentUser = req.user!;

  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const targetUserId = isAdmin && userId ? String(userId) : currentUser.id;

  // به‌روزرسانی خودکار عضویت‌های منقضی‌شده قبل از واکشی
  await expireOldMemberships(targetUserId);

  const memberships = await prisma.membership.findMany({
    where: {
      userId: targetUserId,
      ...(sportId ? { sportId: String(sportId) } : {}),
      ...(status ? { status: status as MembershipStatus } : {}),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      sport: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return sendSuccess(res, "لیست عضویت‌ها دریافت شد.", { memberships });
});

// دریافت جزئیات یک عضویت (با کنترل دسترسی و تشخیص انقضا)
export const getMembership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const currentUser = req.user!;

  // به‌روزرسانی خودکار عضویت‌های منقضی‌شده قبل از واکشی
  await expireOldMemberships(currentUser.id);

  const membership = await prisma.membership.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      sport: { select: { id: true, name: true } },
    },
  });

  if (!membership) {
    throw new ApiError(404, "عضویت پیدا نشد.");
  }

  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  if (!isAdmin && membership.userId !== currentUser.id) {
    throw new ApiError(403, "شما اجازه دسترسی به این اطلاعات را ندارید.");
  }

  return sendSuccess(res, "جزئیات عضویت دریافت شد.", { membership });
});

// ویرایش عضویت (تمدید یا تغییر وضعیت)
export const updateMembership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { startsAt, endsAt, status } = req.body;
  const currentUser = req.user!;

  const membership = await prisma.membership.findUnique({ where: { id } });

  if (!membership) {
    throw new ApiError(404, "عضویت پیدا نشد.");
  }

  // بررسی دسترسی: ادمین‌ها می‌توانند همه را ویرایش کنند
  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  if (!isAdmin) {
    throw new ApiError(403, "شما اجازه ویرایش این عضویت را ندارید.");
  }

  // بررسی اعتبار تاریخ‌ها پس از اعمال تغییرات
  const finalStartsAt = startsAt ? new Date(startsAt) : membership.startsAt;
  const finalEndsAt = endsAt ? new Date(endsAt) : membership.endsAt;

  if (finalEndsAt <= finalStartsAt) {
    throw new ApiError(400, "تاریخ پایان باید بعد از تاریخ شروع باشد.");
  }

  const updated = await prisma.membership.update({
    where: { id },
    data: {
      ...(startsAt ? { startsAt: finalStartsAt } : {}),
      ...(endsAt ? { endsAt: finalEndsAt } : {}),
      ...(status ? { status } : {}),
    },
  });

  return sendSuccess(res, "عضویت با موفقیت ویرایش شد.", { membership: updated });
});

// لغو عضویت (توسط ادمین)
export const cancelMembership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const currentUser = req.user!;

  const membership = await prisma.membership.findUnique({ where: { id } });

  if (!membership) {
    throw new ApiError(404, "عضویت پیدا نشد.");
  }

  // بررسی دسترسی ادمین
  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  if (!isAdmin) {
    throw new ApiError(403, "شما اجازه لغو این عضویت را ندارید.");
  }

  if (membership.status !== "ACTIVE") {
    throw new ApiError(400, "فقط عضویت‌های فعال قابل لغو هستند.");
  }

  await prisma.membership.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return sendSuccess(res, "عضویت با موفقیت لغو شد.");
});