/**
 * روتر بررسی سلامت سرور.
 * دلیل اصلاح: بازگرداندن کد 503 در صورت قطع اتصال دیتابیس برای Load Balancer.
 */
import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    // تست اتصال به دیتابیس با یک کوئری ساده
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: "Gym Backend is running!",
      services: { server: "up", database: "connected" },
    });
  } catch (error) {
    // اگر دیتابیس در دسترس نبود، کد 503 برگردان
    return res.status(503).json({
      success: false,
      message: "Database is unavailable.",
      services: { server: "up", database: "disconnected" },
    });
  }
});

export default router;