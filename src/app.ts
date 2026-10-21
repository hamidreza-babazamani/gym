import express from "express";
import healthRoutes from "./routes/health.routes";
import notFoundMiddleware from "./middlewares/not-found.middleware";
import errorMiddleware from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import coachStudentRoutes from "./routes/coach-student.routes";

const app = express();

app.use(express.json());

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", coachStudentRoutes);

// مدیریت مسیرهای نامعتبر
app.use(notFoundMiddleware);

// مدیریت خطاهای داخلی؛ باید آخرین Middleware باشد
app.use(errorMiddleware);

export default app;