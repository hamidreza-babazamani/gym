/**
 * توابع کمکی برای مدیریت وضعیت عضویت‌ها.
 * دلیل استفاده: تشخیص خودکار عضویت‌های منقضی‌شده بدون نیاز به Cron Job.
 */
import prisma from "../lib/prisma";

export const expireOldMemberships = async (userId?: string) => {
  const now = new Date();
  
  await prisma.membership.updateMany({
    where: {
      ...(userId ? { userId } : {}),
      status: "ACTIVE",
      endsAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });
};