/**
 * فایل اتصال به دیتابیس (Prisma).
 * دلیل استفاده از env: به جای استفاده مستقیم از process.env.DATABASE_URL، از کانفیگ معتبرسنجی‌شده استفاده می‌کنیم.
 * این کار جلوی خطای "undefined" بودن آدرس دیتابیس را در زمان اجرا می‌گیرد.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";

// ساخت Adapter برای اتصال Prisma به PostgreSQL
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

// ساخت نمونه مشترک Prisma Client
const prisma = new PrismaClient({ adapter });

export default prisma;