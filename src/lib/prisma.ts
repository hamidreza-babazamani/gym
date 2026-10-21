
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// ساخت Adapter برای اتصال Prisma به PostgreSQL
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// ساخت نمونه مشترک Prisma Client
const prisma = new PrismaClient({ adapter });

export default prisma;
