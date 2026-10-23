/**
 * فایل اصلی اکسپرس.
 * دلیل آپدیت: اضافه شدن هدرهای امنیتی (helmet)، تنظیمات CORS و محدودیت درخواست‌ها (Rate Limit).
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

const app = express();

// ۱. تنظیمات امنیتی هدرهای HTTP (باید در بالاترین سطح باشد)
app.use(helmet());

// ۲. تنظیمات CORS
app.use(cors(corsOptions));

// ۳. لاگر
app.use(pinoHttp({ logger }));

// ۴. پارس کردن بدنه درخواست‌ها
app.use(express.json({ limit: "10kb" })); // محدود کردن حجم بدنه برای جلوگیری از DoS

// ۵. محدودیت کلی درخواست‌ها
app.use(globalLimiter);

// ۶. مسیرها
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authLimiter, authRoutes); // محدودیت سخت‌گیرانه‌تر برای مسیرهای احراز هویت
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", coachStudentRoutes);

// ۷. مدیریت مسیرهای نامعتبر
app.use(notFoundMiddleware);

// ۸. مدیریت خطاهای داخلی
app.use(errorMiddleware);

export default app;