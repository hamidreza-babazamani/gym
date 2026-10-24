/**
 * قوانین اعتبارسنجی برای مسیرهای پرداخت.
 * دلیل استفاده: جلوگیری از ورود داده‌های نامعتبر برای ایجاد سفارش و تأیید پرداخت.
 */
import { z } from "zod";

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    price: z.number().int().positive("قیمت باید عددی مثبت باشد."),
    interval: z.enum(["MONTHLY", "YEARLY"]).optional(),
    durationDays: z.number().int().positive("مدت اعتبار باید عددی مثبت باشد."),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    planId: z.string().uuid("شناسه پلن معتبر نیست."),
    idempotencyKey: z.string().min(10).max(100).optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    authority: z.string().min(1, "کد رهگیری الزامی است."),
    status: z.enum(["OK", "NOK"]),
  }),
});