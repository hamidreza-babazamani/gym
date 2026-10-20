
import { Request, Response } from "express";

// مدیریت درخواست‌هایی که هیچ مسیری برای آن‌ها تعریف نشده است
const notFoundMiddleware = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "مسیر موردنظر پیدا نشد.",
    path: req.originalUrl,
  });
};

export default notFoundMiddleware;
