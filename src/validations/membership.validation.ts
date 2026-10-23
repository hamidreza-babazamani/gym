/**
 * قوانین اعتبارسنجی برای مسیرهای عضویت.
 * دلیل اصلاح: اضافه کردن چک منطقی برای تاریخ‌ها (پایان باید بعد از شروع باشد).
 */
import { z } from "zod";

export const createMembershipSchema = z.object({
  body: z.object({
    userId: z.string().uuid("شناسه کاربر معتبر نیست."),
    sportId: z.string().uuid("شناسه رشته ورزشی معتبر نیست."),
    startsAt: z.string().datetime("تاریخ شروع معتبر نیست."),
    endsAt: z.string().datetime("تاریخ پایان معتبر نیست."),
  }).refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "تاریخ پایان باید بعد از تاریخ شروع باشد.",
    path: ["endsAt"],
  }),
});

export const updateMembershipSchema = z.object({
  body: z.object({
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  }),
}); 