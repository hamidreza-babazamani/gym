/**
 * کنترلرهای مدیریتی.
 * دلیل بازنویسی: استفاده از ApiError برای پرتاب خطاها و asyncHandler برای حذف try/catch.
 * این کار باعث می‌شود منطق اصلی برنامه خواناتر باشد.
 */
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

// تبدیل شاگرد به مربی؛ فقط توسط Super Admin
export const promoteToCoach = asyncHandler(
  async (req: Request, res: Response) => {
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (!userId) {
      throw new ApiError(400, "شناسه کاربر معتبر نیست.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new ApiError(404, "کاربر پیدا نشد.");
    }

    if (user.roles.some((item) => item.role === "SUPER_ADMIN")) {
      throw new ApiError(403, "نقش Super Admin از این مسیر قابل تغییر نیست.");
    }

    if (user.roles.some((item) => item.role === "COACH")) {
      throw new ApiError(409, "این کاربر از قبل مربی است.");
    }

    await prisma.userRole.create({
      data: {
        userId: user.id,
        role: "COACH",
      },
    });

    return sendSuccess(res, "کاربر با موفقیت به مربی تبدیل شد.", {
      userId: user.id,
      role: "COACH",
    });
  }
);