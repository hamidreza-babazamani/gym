import express from "express";
import healthRoutes from "./routes/health.routes";
import notFoundMiddleware from "./middlewares/not-found.middleware";
import errorMiddleware from "./middlewares/error.middleware";

const app = express();

app.use(express.json());

app.use("/api/v1/health", healthRoutes);

// مدیریت مسیرهای نامعتبر
app.use(notFoundMiddleware);

// مدیریت خطاهای داخلی؛ باید آخرین Middleware باشد
app.use(errorMiddleware);

export default app;