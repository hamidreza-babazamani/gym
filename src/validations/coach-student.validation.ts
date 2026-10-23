/**
 * قوانین اعتبارسنجی برای مسیرهای ارتباط مربی و شاگرد.
 * دلیل استفاده: جلوگیری از ارسال داده‌های نامعتبر و مدیریت درخواست‌ها.
 */
import { z } from "zod";

export const requestCoachSchema = z.object({
  body: z.object({
    sportId: z.string().uuid("شناسه رشته ورزشی معتبر نیست."),
  }),
});

export const respondToCoachRequestSchema = z.object({
  body: z.object({
    decision: z.enum(["APPROVE", "REJECT"], {
      message: "تصمیم باید APPROVE یا REJECT باشد.",
    }),
  }),
});

export const endCoachStudentSchema = z.object({
  body: z.object({
    reason: z.string().max(500, "دلیل پایان ارتباط نمی‌تواند بیش از ۵۰۰ کاراکتر باشد.").optional(),
  }),
});