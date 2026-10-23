/**
 * قوانین اعتبارسنجی برای مسیرهای احراز هویت.
 * دلیل استفاده: استفاده از Zod برای بررسی صحت داده‌های ورودی قبل از رسیدن به کنترلر.
 */
import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(3, "نام کامل باید حداقل ۳ کاراکتر باشد.").max(120),
    email: z.string().email("فرمت ایمیل معتبر نیست."),
    phone: z.string().regex(/^\+?[\d\s()-]{7,20}$/, "فرمت شماره موبایل معتبر نیست.").optional(),
    password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.").max(72, "رمز عبور بیش از حد طولانی است."),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("فرمت ایمیل معتبر نیست."),
    password: z.string().min(1, "رمز عبور الزامی است."),
  }),
});
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "رمز عبور فعلی الزامی است."),
    newPassword: z.string().min(8, "رمز عبور جدید باید حداقل ۸ کاراکتر باشد.").max(72, "رمز عبور بیش از حد طولانی است."),
  }),
});
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("فرمت ایمیل معتبر نیست."),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "توکن الزامی است."),
    newPassword: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.").max(72),
  }),
});
export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(3, "نام کامل باید حداقل ۳ کاراکتر باشد.").max(120).optional(),
    phone: z.string().regex(/^\+?[\d\s()-]{7,20}$/, "فرمت شماره موبایل معتبر نیست.").optional(),
  }),
});
export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "توکن الزامی است."),
  }),
});
export const changeEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().email("فرمت ایمیل معتبر نیست."),
    password: z.string().min(1, "رمز عبور برای تأیید تغییر ایمیل الزامی است."),
  }),
});
export const verifyPhoneSchema = z.object({
  body: z.object({
    token: z.string().min(1, "توکن الزامی است."),
  }),
});