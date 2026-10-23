/**
 * تنظیمات CORS.
 * دلیل استفاده: فقط دامنه‌های مجاز (فرانت‌کارت) اجازه دسترسی به API را دارند.
 */
import cors from "cors";
import { env } from "./env";

export const corsOptions: cors.CorsOptions = {
  origin: env.NODE_ENV === "production" 
    ? [process.env.FRONTEND_URL || "https://yourdomain.com"] 
    : ["http://localhost:3000", "http://localhost:5173"], // پورت‌های رایج فرانت‌کارت در توسعه
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // برای ارسال کوکی‌ها یا هدرهای احراز هویت
  maxAge: 86400, // کش کردن تنظیمات CORS در مرورگر به مدت ۱ روز
};