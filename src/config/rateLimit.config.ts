/**
 * تنظیمات محدودیت درخواست (Rate Limiting).
 * دلیل استفاده: جلوگیری از حملات Brute-force و DoS.
 */
import rateLimit from "express-rate-limit";

// محدودیت کلی برای کل API
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 100, // حداکثر ۱۰۰ درخواست در هر ۱۵ دقیقه برای هر IP
  message: {
    success: false,
    message: "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
  },
  standardHeaders: true, // برگرداندن هدرهای استاندارد RateLimit
  legacyHeaders: false,
});

// محدودیت سخت‌گیرانه برای مسیرهای حساس (لاگین، ثبت‌نام، فراموشی رمز)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 10, // حداکثر ۱۰ درخواست در هر ۱۵ دقیقه
  message: {
    success: false,
    message: "تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // درخواست‌های موفق را در شمارش حساب نکن
});
// محدودیت سخت‌گیرانه برای درخواست ارسال مجدد ایمیل تأیید
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ۱ ساعت
  max: 3, // حداکثر ۳ درخواست در هر ساعت
  message: {
    success: false,
    message: "تعداد درخواست‌های شما برای ارسال ایمیل بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
// محدودیت آپلود فایل (برای جلوگیری از DoS)
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 20, // حداکثر ۲۰ فایل در هر ۱۵ دقیقه
  message: {
    success: false,
    message: "تعداد درخواست‌های آپلود شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});