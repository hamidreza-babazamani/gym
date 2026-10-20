
import { Router } from "express";

// ساخت روتر مربوط به بررسی سلامت سرور
const router = Router();

// مسیر بررسی سلامت بک‌اند
router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Gym Backend is running!",
  });
});

export default router;
