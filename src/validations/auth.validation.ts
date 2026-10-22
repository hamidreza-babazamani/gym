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