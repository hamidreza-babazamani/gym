/**
 * قوانین اعتبارسنجی برای مسیرهای رشته‌های ورزشی.
 * دلیل استفاده: جلوگیری از ورود داده‌های نامعتبر و حملات Mass Assignment.
 */
import { z } from "zod";

export const createSportSchema = z.object({
  body: z.object({
    name: z.string().min(2, "نام رشته باید حداقل ۲ کاراکتر باشد.").max(100),
    description: z.string().optional(),
    icon: z.string().url("آدرس آیکون باید یک URL معتبر باشد.").optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

export const updateSportSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    icon: z.string().url().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});