
import { Router } from "express";
import { login, register, getMe } from "../controllers/auth.controller";
//import { login, register, getMe } from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";

const router = Router();

// ثبت‌نام
router.post("/register", register);

// ورود
router.post("/login", login);

// دریافت پروفایل کاربر با توکن معتبر
router.get("/me", authMiddleware, getMe);

export default router;
