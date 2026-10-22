/**
 * روتر بررسی سلامت سرور.
 * دلیل آپدیت: بررسی وضعیت اتصال به دیتابیس (PostgreSQL) علاوه بر سلامت خود سرور.
 */
import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    let dbStatus = "disconnected";

    try {
      // یک کوئری ساده برای تست اتصال به دیتابیس
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (error) {
      dbStatus = "disconnected";
    }

    res.status(200).json({
      success: true,
      message: "Gym Backend is running!",
      services: {
        server: "up",
        database: dbStatus,
      },
    });
  })
);

export default router;