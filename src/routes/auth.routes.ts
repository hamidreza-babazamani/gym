/**
 * مسیرهای مربوط به احراز هویت.
 * دلیل آپدیت: اضافه شدن مسیرهای تازه‌سازی توکن (refresh) و خروج (logout).
 */
import { Router } from "express";
import { login, register, getMe, refresh, logout } from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema } from "../validations/auth.validation";
import { z } from "zod";

const router = Router();

// قوانین اعتبارسنجی برای توکن تازه‌سازی
const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "توکن تازه‌سازی الزامی است."),
  }),
});

// ثبت‌نام (با اعتبارسنجی Zod)
router.post("/register", validate(registerSchema), register);

// ورود (با اعتبارسنجی Zod)
router.post("/login", validate(loginSchema), login);

// دریافت پروفایل کاربر با توکن معتبر
router.get("/me", authMiddleware, getMe);

// تازه‌سازی توکن
router.post("/refresh", validate(refreshSchema), refresh);

// خروج
router.post("/logout", validate(refreshSchema), logout);

export default router;