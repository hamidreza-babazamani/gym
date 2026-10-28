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
  // در صورت فراموشی تنظیم NODE_ENV، امن‌ترین حالت (production) انتخاب می‌شود
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  PORT: z.string().default("5000").transform((val) => Number(val)),
  DATABASE_URL: z.string().url("آدرس دیتابیس (DATABASE_URL) معتبر نیست."),
  JWT_SECRET: z.string().min(10, "کلید JWT_SECRET باید حداقل ۱۰ کاراکتر باشد."),
  JWT_EXPIRES_IN: z.string().default("15m"),
  MOCK_PAYMENT_ENABLED: z.string().default("false").transform((val) => val === "true"),
});

// اعتبارسنجی
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("خطا در متغیرهای محیطی (.env):");
  console.error(parsedEnv.error.format());
  process.exit(1); // خروج اجباری برنامه
}

const env = parsedEnv.data;

// چک‌های اضافی مخصوص محیط production
if (env.NODE_ENV === "production") {
  const errors: string[] = [];

  if (env.JWT_SECRET.length < 32) {
    errors.push("در production، JWT_SECRET باید حداقل ۳۲ کاراکتر باشد.");
  }

  // جلوگیری از سکرت‌های ضعیف مثل "aaaaaaaaaaaaaaaaaaaa"
  if (/^(.)\1+$/.test(env.JWT_SECRET)) {
    errors.push("JWT_SECRET نباید از تکرار یک کاراکتر تشکیل شده باشد.");
  }

  if (errors.length > 0) {
    console.error("خطا در تنظیمات production:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

export { env };