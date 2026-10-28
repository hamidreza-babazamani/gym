import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { corsOptions } from "./config/cors.config";
import { globalLimiter, authLimiter, aiLimiter } from "./config/rateLimit.config";
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
import fileRoutes from "./routes/file.routes";
import chatRoutes from "./routes/chat.routes";
import notificationRoutes from "./routes/notification.routes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import progressRoutes from "./routes/progress.routes";
import paymentRoutes from "./routes/payment.routes";
import aiRoutes from "./routes/ai.routes";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true })); // N-02 fix: Parse HTML form submissions
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1/health", healthRoutes);
app.use(globalLimiter);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", coachStudentRoutes);
app.use("/api/v1/sports", sportRoutes);
app.use("/api/v1/memberships", membershipRoutes);
app.use("/api/v1/programs", programRoutes);
app.use("/api/v1/groups", groupRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/ai", aiLimiter, aiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;