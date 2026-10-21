import "dotenv/config";
import prisma from "./src/lib/prisma";

async function main() {
  // پیدا کردن کاربر با ایمیل
  const user = await prisma.user.findUnique({
    where: { email: "student@example.com" },
  });

  if (!user) {
    throw new Error("کاربر پیدا نشد.");
  }

  // بررسی اینکه نقش قبلاً ثبت نشده باشد
  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: user.id,
        role: "SUPER_ADMIN",
      },
    },
    update: {},
    create: {
      userId: user.id,
      role: "SUPER_ADMIN",
    },
  });

  console.log("نقش SUPER_ADMIN با موفقیت ثبت شد.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
