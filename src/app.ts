/**
 * فایل اصلی اکسپرس.
 * دلیل آپدیت: اضافه شدن trust proxy و مستثنی کردن مسیر health از Rate Limit.
 */
import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { corsOptions } from "./config/cors.config";
import { globalLimiter, authLimiter } from "./config/rateLimit.config";
import healthRoutes from "./routes/health.routes";
import notFoundMiddleware from "./middlewares/not-found.middleware";
import errorMiddleware from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import coachStudentRoutes from "./routes/coach-student.routes";
import sportRoutes from "./routes/sport.routes";
import membershipRoutes from "./routes/membership.routes";
import programRoutes from "./routes/program.routes";
import groupRoutes from "./routes/group.routes";

const app = express();

// اعتماد به پروکسی برای تشخیص درست IP کاربر در محیط پروداکشن
app.set("trust proxy", 1);

// ۱. تنظیمات امنیتی هدرهای HTTP
app.use(helmet());

// ۲. تنظیمات CORS
app.use(cors(corsOptions));

// ۳. لاگر
app.use(pinoHttp({ logger }));

// ۴. پارس کردن بدنه درخواست‌ها
app.use(express.json({ limit: "10kb" }));

// ۵. مسیر Health Check (بدون Rate Limit)
app.use("/api/v1/health", healthRoutes);

// ۶. محدودیت کلی درخواست‌ها (برای بقیه مسیرها)
app.use(globalLimiter);

// ۷. بقیه مسیرها
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", coachStudentRoutes);
app.use("/api/v1/sports", sportRoutes);
app.use("/api/v1/memberships", membershipRoutes);
app.use("/api/v1/programs", programRoutes);
app.use("/api/v1/groups", groupRoutes);

// ۸. مدیریت مسیرهای نامعتبر
app.use(notFoundMiddleware);

// ۹. مدیریت خطاهای داخلی
app.use(errorMiddleware);

export default app;