
import { Response, NextFunction } from "express";
import { Prisma } from "../../generated/prisma/client";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError, sendSuccess } from "../utils/api-response";

// ارسال درخواست شاگرد برای پیوستن به مربی
export const requestCoach = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawCoachId = req.params.coachId;
    const coachId = Array.isArray(rawCoachId)
      ? rawCoachId[0]
      : rawCoachId;

    const studentId = req.user?.id;

    if (!studentId) {
      return sendError(res, "ابتدا وارد حساب کاربری شوید.", 401);
    }

    if (!coachId || coachId === studentId) {
      return sendError(res, "شناسه مربی معتبر نیست.", 400);
    }

    // بررسی اینکه کاربر هدف واقعاً مربی فعال باشد
    const coach = await prisma.user.findFirst({
      where: {
        id: coachId,
        status: "ACTIVE",
        roles: {
          some: { role: "COACH" },
        },
      },
      select: { id: true },
    });

    if (!coach) {
      return sendError(res, "مربی موردنظر پیدا نشد.", 404);
    }

    // ایجاد ارتباط در وضعیت انتظار برای تأیید مربی
    const request = await prisma.coachStudent.create({
      data: {
        coachId,
        studentId,
        status: "PENDING",
      },
    });

    return sendSuccess(
      res,
      "درخواست شما برای مربی ارسال شد.",
      {
        requestId: request.id,
        coachId: request.coachId,
        status: request.status,
      },
      201
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return sendError(
        res,
        "برای این مربی قبلاً درخواست ثبت کرده‌اید.",
        409
      );
    }

    return next(error);
  }
};

/**
 * تأیید یا رد درخواست شاگرد توسط همان مربی
 */
export const respondToCoachRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawRequestId = req.params.requestId;
    const requestId = Array.isArray(rawRequestId)
      ? rawRequestId[0]
      : rawRequestId;

    const coachId = req.user?.id;
    const { decision } = req.body ?? {};

    if (!requestId || !coachId) {
      return sendError(res, "اطلاعات درخواست معتبر نیست.", 400);
    }

    if (decision !== "APPROVE" && decision !== "REJECT") {
      return sendError(
        res,
        "تصمیم باید APPROVE یا REJECT باشد.",
        400
      );
    }

    // فقط مربی صاحب درخواست می‌تواند آن را بررسی کند
    const request = await prisma.coachStudent.findFirst({
      where: {
        id: requestId,
        coachId,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (!request) {
      return sendError(
        res,
        "درخواست پیدا نشد یا قبلاً بررسی شده است.",
        404
      );
    }

    const updatedRequest = await prisma.coachStudent.update({
      where: { id: request.id },
      data: {
        status: decision === "APPROVE" ? "ACTIVE" : "REJECTED",
        ...(decision === "APPROVE" ? { startedAt: new Date() } : {}),
      },
    });

    return sendSuccess(
      res,
      decision === "APPROVE"
        ? "درخواست شاگرد تأیید شد."
        : "درخواست شاگرد رد شد.",
      {
        requestId: updatedRequest.id,
        status: updatedRequest.status,
      }
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * دریافت فهرست مربیان فعال برای شاگردها
 */
export const listCoaches = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // بررسی ورود کاربر به حساب
    if (!req.user?.id) {
      return sendError(res, "ابتدا وارد حساب کاربری شوید.", 401);
    }

    // دریافت مربیانی که حساب فعال و نقش مربی دارند
    const coaches = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        roles: {
          some: { role: "COACH" },
        },
      },
      // فقط اطلاعات عمومی و ضروری مربی برگردانده می‌شود
      select: {
        id: true,
        fullName: true,
      },
      // مرتب‌سازی نام مربیان به ترتیب حروف الفبا
      orderBy: {
        fullName: "asc",
      },
    });

    // ارسال فهرست مربیان به همراه تعداد آن‌ها
    return sendSuccess(
      res,
      "فهرست مربیان فعال دریافت شد.",
      {
        coaches,
        count: coaches.length,
      }
    );
  } catch (error) {
    return next(error);
  }
};
