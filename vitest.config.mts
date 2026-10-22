/**
 * کانفیگ تست‌های پروژه با Vitest.
 * دلیل استفاده: تعیین مسیر فایل‌های تست و جلوگیری از تست شدن فایل‌های نامربوط.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // اجازه استفاده از describe و it بدون import
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});