
import { Request, Response, NextFunction } from "express";
import { Prisma } from "../../generated/prisma/client";
import prisma from "../lib/prisma";
import { sendError, sendSuccess } from "../utils/api-response";

// تبدیل شاگرد به مربی؛ فقط توسط Super Admin
export const promoteToCoach = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId)
      ? rawUserId[0]
      : rawUserId;

    if (!userId) {
      return sendError(res, "شناسه کاربر معتبر نیست.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
      },
    });

    if (!user) {
      return sendError(res, "کاربر پیدا نشد.", 404);
    }

    if (user.roles.some((item) => item.role === "SUPER_ADMIN")) {
      return sendError(
        res,
        "نقش Super Admin از این مسیر قابل تغییر نیست.",
        403
      );
    }

    if (user.roles.some((item) => item.role === "COACH")) {
      return sendError(res, "این کاربر از قبل مربی است.", 409);
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return sendError(res, "این نقش قبلاً ثبت شده است.", 409);
    }

    return next(error);
  }
};
