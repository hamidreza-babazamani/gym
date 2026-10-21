/**
 * ابزار کمکی برای مدیریت خطاهای asynchronous در کنترلرها.
 * دلیل استفاده: جلوگیری از تکرار بلوک‌های try/catch در تمام کنترلرها.
 * این تابع هر خطایی که در کنترلر رخ دهد را گرفته و به میدل‌ور مرکزی (errorMiddleware) پاس می‌دهد.
 */
import { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};