import { Response } from "express";

// ساخت پاسخ موفق استاندارد برای API
export const sendSuccess = (
  res: Response,
  message: string,
  data?: unknown,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined && { data }),
  });
};

// ساخت پاسخ خطای استاندارد برای API
export const sendError = (
  res: Response,
  message: string,
  statusCode = 400
) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
