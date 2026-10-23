/**
 * کنترلرهای مدیریت عضویت‌ها.
 * دلیل استفاده: پیاده‌سازی عملیات CRUD و مدیریت وضعیت‌های زمانی.
 */
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

// ایجاد عضویت جدید (توسط ادمین)
export const createMembership = asyncHandler(async (req: Request, res: Response) => {
  const { userId, sportId, startsAt, endsAt } = req.body;

  // بررسی وجود کاربر
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "کاربر پیدا نشد.");
  }

  // بررسی وجود رشته
  const sport = await prisma.sport.findUnique({ where: { id: sportId } });
  if (!sport) {
    throw new ApiError(404, "رشته ورزشی پیدا نشد.");
  }

  // بررسی اینکه آیا کاربر از قبل عضویت فعالی در این رشته دارد
  const existing = await prisma.membership.findFirst({
    where: {
      userId,
      sportId,
      status: "ACTIVE",
    },
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

// دریافت لیست عضویت‌ها (با فیلتر)
export const listMemberships = asyncHandler(async (req: Request, res: Response) => {
  const { userId, sportId, status } = req.query;

  const memberships = await prisma.membership.findMany({
    where: {
      ...(userId ? { userId: String(userId) } : {}),
      ...(sportId ? { sportId: String(sportId) } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      sport: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return sendSuccess(res, "لیست عضویت‌ها دریافت شد.", { memberships });
});

// دریافت جزئیات یک عضویت
export const getMembership = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

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

  return sendSuccess(res, "جزئیات عضویت دریافت شد.", { membership });
});

// ویرایش عضویت (تمدید یا تغییر وضعیت)
export const updateMembership = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { startsAt, endsAt, status } = req.body;

  const membership = await prisma.membership.findUnique({ where: { id } });

  if (!membership) {
    throw new ApiError(404, "عضویت پیدا نشد.");
  }

  const updated = await prisma.membership.update({
    where: { id },
    data: {
      ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
      ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
      ...(status ? { status } : {}),
    },
  });

  return sendSuccess(res, "عضویت با موفقیت ویرایش شد.", { membership: updated });
});

// لغو عضویت
export const cancelMembership = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const membership = await prisma.membership.findUnique({ where: { id } });

  if (!membership) {
    throw new ApiError(404, "عضویت پیدا نشد.");
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