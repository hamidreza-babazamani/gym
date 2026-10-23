/**
 * مسیرهای مربوط به احراز هویت.
 * دلیل آپدیت: اضافه شدن مسیرهای تأیید ایمیل و ارسال مجدد لینک تأیید.
 */
import { Router } from "express";
import { 
  login, register, getMe, refresh, logout, changePassword, 
  forgotPassword, resetPassword, updateProfile,
  verifyEmail, resendVerificationEmail
} from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { 
  registerSchema, loginSchema, changePasswordSchema, 
  forgotPasswordSchema, resetPasswordSchema, updateProfileSchema,
  verifyEmailSchema
} from "../validations/auth.validation";
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

// ویرایش پروفایل کاربر (نیاز به لاگین)
router.patch("/profile", authMiddleware, validate(updateProfileSchema), updateProfile);

// تازه‌سازی توکن
router.post("/refresh", validate(refreshSchema), refresh);

// خروج
router.post("/logout", validate(refreshSchema), logout);

// تغییر رمز عبور (نیاز به لاگین)
router.patch("/change-password", authMiddleware, validate(changePasswordSchema), changePassword);

// درخواست بازیابی رمز عبور
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

// تنظیم رمز عبور جدید
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// تأیید ایمیل
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);

// ارسال مجدد لینک تأیید
router.post("/resend-verification", validate(forgotPasswordSchema), resendVerificationEmail);

export default router;