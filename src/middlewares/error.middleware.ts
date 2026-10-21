/**
 * میدل‌ور مرکزی مدیریت خطاها.
 * دلیل آپدیت: اضافه شدن پشتیبانی از خطاهای اعتبارسنجی Zod (ZodError).
 */
import { ErrorRequestHandler } from "express";
import { ApiError } from "../utils/ApiError";
import { Prisma } from "../../generated/prisma/client";
import { sendError } from "../utils/api-response";
import { ZodError } from "zod";

const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  // ۱. خطاهای اعتبارسنجی Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return sendError(res, "اطلاعات ورودی نامعتبر است.", 400, formattedErrors);
  }

  // ۲. خطاهای سفارشی خودمان
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode);
  }

  // ۳. خطاهای شناخته‌شده دیتابیس (Prisma)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return sendError(res, "اطلاعات وارد شده تکراری است.", 409);
    }
    if (err.code === "P2025") {
      return sendError(res, "رکورد مورد نظر یافت نشد.", 404);
    }
  }

  // ۴. خطاهای ناشناخته
  return sendError(res, "خطای داخلی سرور رخ داده است.", 500);
};

export default errorMiddleware;