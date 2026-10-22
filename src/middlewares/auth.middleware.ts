/**
 * میدل‌ور احراز هویت.
 * دلیل آپدیت: استفاده از تابع verifyAccessToken و ApiError برای مدیریت تمیزتر خطاها.
 */
import { Response, NextFunction, Request } from "express";
import prisma from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyAccessToken } from "../utils/token.utils";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
  };
}

const authMiddleware = asyncHandler(async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "ابتدا وارد حساب کاربری شوید.");
  }

  try {
    const token = authorization.slice(7);
    const decoded = verifyAccessToken(token);

    if (!decoded.sub) {
      throw new ApiError(401, "توکن معتبر نیست.");
    }

    // دریافت وضعیت و نقش‌های فعلی کاربر از دیتابیس
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        status: true,
        roles: { select: { role: true } },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new ApiError(401, "حساب کاربری معتبر یا فعال نیست.");
    }

    req.user = {
      id: user.id,
      roles: user.roles.map((item) => item.role),
    };

    next();
  } catch (error) {
    // اگر خطای JWT بود، پیام مناسب بده
    if (error instanceof Error && error.name === "JsonWebTokenError") {
      throw new ApiError(401, "توکن نامعتبر یا منقضی شده است.");
    }
    throw error;
  }
});

export default authMiddleware;