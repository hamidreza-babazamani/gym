/**
 * قوانین اعتبارسنجی برای مسیرهای هوش مصنوعی.
 * دلیل استفاده: جلوگیری از ورود پرامپت‌های خالی یا بیش از حد طولانی.
 */
import { z } from "zod";

export const chatWithAISchema = z.object({
  body: z.object({
    message: z.string().min(1, "پیام نمی‌تواند خالی باشد.").max(1000, "پیام بیش از حد طولانی است."),
  }),
});