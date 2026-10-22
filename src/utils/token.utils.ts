/**
 * توابع کمکی برای مدیریت توکن‌ها.
 * دلیل استفاده: جداسازی منطق ساخت و اعتبارسنجی توکن‌ها از کنترلرها.
 */
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

// ساخت توکن دسترسی (کوتاه‌عمر)
export const generateAccessToken = (userId: string, roles: string[]) => {
  return jwt.sign({ roles }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: "15m", // ۱۵ دقیقه اعتبار
  });
};

// ساخت توکن تازه‌سازی (تصادفی و طولانی)
export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

// هش کردن توکن تازه‌سازی برای ذخیره در دیتابیس (به دلایل امنیتی نباید متن ساده ذخیره شود)
export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// بررسی توکن دسترسی و استخراج اطلاعات
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as { sub: string; roles: string[] };
};