/**
 * قوانین اعتبارسنجی برای مسیرهای گروه‌ها.
 * دلیل استفاده: جلوگیری از ورود داده‌های نامعتبر برای گروه و اعضا.
 */
import { z } from "zod";

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2, "نام گروه باید حداقل ۲ کاراکتر باشد.").max(150),
    description: z.string().optional(),
    capacity: z.number().int().min(1, "ظرفیت باید حداقل ۱ باشد.").max(100).optional(),
  }),
});

export const updateGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150).optional(),
    description: z.string().optional(),
    capacity: z.number().int().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const addMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid("شناسه کاربر معتبر نیست."),
  }),
});