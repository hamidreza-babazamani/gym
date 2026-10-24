/**
 * قوانین اعتبارسنجی برای مسیرهای پیشرفت.
 * دلیل اصلاح: استفاده از refine برای اطمینان از ارسال حداقل یک فیلد اندازه‌گیری و بررسی دقیق‌تر وزن.
 */
import { z } from "zod";

export const createProgressLogSchema = z.object({
  body: z.object({
    weight: z.number().positive("وزن باید عددی مثبت باشد.").optional(),
    bodyFat: z.number().min(0, "درصد چربی نمی‌تواند منفی باشد.").max(100).optional(),
    chest: z.number().positive("دور سینه باید عددی مثبت باشد.").optional(),
    waist: z.number().positive("دور کمر باید عددی مثبت باشد.").optional(),
    hips: z.number().positive("دور باسن باید عددی مثبت باشد.").optional(),
    arms: z.number().positive("دور بازو باید عددی مثبت باشد.").optional(),
    legs: z.number().positive("دور پا باید عددی مثبت باشد.").optional(),
    notes: z.string().max(500, "متن یادداشت بیش از حد طولانی است.").optional(),
  }).refine(data => Object.values(data).some(val => val !== undefined), {
    message: "حداقل یکی از فیلدهای اندازه‌گیری باید ارسال شود.",
  }),
});

export const createProgressNoteSchema = z.object({
  body: z.object({
    studentId: z.string().uuid("شناسه ورزشکار معتبر نیست."),
    content: z.string().min(1, "متن یادداشت نمی‌تواند خالی باشد.").max(1000),
  }),
});