/**
 * این فایل متغیرهای محیطی (.env) را با استفاده از Zod اعتبارسنجی می‌کند.
 * دلیل استفاده: جلوگیری از خطاهای زمان اجرا (Runtime Errors) اگر متغیرهای ضروری مثل دیتابیس یا سکرت توکن تنظیم نشده باشند.
 * اگر متغیری نامعتبر باشد، سرور اصلاً بالا نمی‌آید و خطای دقیق نشان می‌دهد.
 */
import { z } from "zod";
import dotenv from "dotenv";

// بارگذاری فایل .env در حافظه
dotenv.config();

// تعریف ساختار مورد انتظار از فایل .env
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000").transform((val) => Number(val)),
  DATABASE_URL: z.string().url("آدرس دیتابیس (DATABASE_URL) معتبر نیست."),
  JWT_SECRET: z.string().min(10, "کلید JWT_SECRET باید حداقل ۱۰ کاراکتر باشد."),
  JWT_EXPIRES_IN: z.string().default("15m"),
});

// اعتبارسنجی
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("خطا در متغیرهای محیطی (.env):");
  console.error(parsedEnv.error.format());
  process.exit(1); // خروج اجباری برنامه
}

// خروجی نهایی و تایپ‌شده
export const env = parsedEnv.data;