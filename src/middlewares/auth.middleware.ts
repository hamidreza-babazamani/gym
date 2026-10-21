
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { sendError } from "../utils/api-response";

// اطلاعات کاربر احراز هویت‌شده
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
  };
}

// بررسی توکن و دریافت اطلاعات به‌روز کاربر از دیتابیس
const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return sendError(res, "ابتدا وارد حساب کاربری شوید.", 401);
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new Error("JWT_SECRET is not configured"));
  }

  try {
    const token = authorization.slice(7);
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string"
    ) {
      return sendError(res, "توکن معتبر نیست.", 401);
    }

    // دریافت وضعیت و نقش‌های فعلی کاربر از دیتابیس
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        status: true,
        roles: {
          select: { role: true },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return sendError(res, "حساب کاربری معتبر یا فعال نیست.", 401);
    }

    req.user = {
      id: user.id,
      roles: user.roles.map((item) => item.role),
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return sendError(res, "توکن نامعتبر یا منقضی شده است.", 401);
    }

    return next(error);
  }
};

export default authMiddleware;
