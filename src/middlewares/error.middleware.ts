
import { ErrorRequestHandler } from "express";

// مدیریت خطاهای داخلی بک‌اند
const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "خطای داخلی سرور رخ داده است.",
  });
};

export default errorMiddleware;
