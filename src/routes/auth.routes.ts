/**
 * مسیرهای مربوط به احراز هویت.
 */
import { Router } from "express";
import { 
  login, register, getMe, refresh, logout, changePassword, 
  forgotPassword, resetPassword, updateProfile,
  verifyEmail, resendVerificationEmail,
  changeEmail,
  requestPhoneVerification,
  verifyPhone,
} from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { resendVerificationLimiter } from "../config/rateLimit.config";
import { 
  registerSchema, loginSchema, changePasswordSchema, 
  forgotPasswordSchema, resetPasswordSchema, updateProfileSchema,
  verifyEmailSchema, changeEmailSchema, verifyPhoneSchema
} from "../validations/auth.validation";
import { z } from "zod";

const router = Router();

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "توکن تازه‌سازی الزامی است."),
  }),
});

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authMiddleware, getMe);
router.patch("/profile", authMiddleware, validate(updateProfileSchema), updateProfile);
router.patch("/change-email", authMiddleware, validate(changeEmailSchema), changeEmail);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", validate(refreshSchema), logout);
router.patch("/change-password", authMiddleware, validate(changePasswordSchema), changePassword);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/resend-verification", resendVerificationLimiter, validate(forgotPasswordSchema), resendVerificationEmail);
router.post("/request-phone-verification", authMiddleware, requestPhoneVerification);
router.post("/verify-phone", validate(verifyPhoneSchema), verifyPhone);

export default router;