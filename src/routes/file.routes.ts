/**
 * مسیرهای مربوط به مدیریت فایل‌ها.
 * دلیل استفاده: تعریف Endpointهای آپلود، لیست، دانلود و حذف.
 */
import { Router } from "express";
import {
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
} from "../controllers/file.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { upload } from "../config/upload.config";
import { uploadLimiter } from "../config/rateLimit.config";


const router = Router();

// آپلود فایل جدید
router.post("/", authMiddleware, upload.single("file"), uploadFile);

// دریافت لیست فایل‌های کاربر
router.get("/", authMiddleware, listFiles);

// دانلود یک فایل
router.get("/:id/download", authMiddleware, downloadFile);

// حذف یک فایل
router.delete("/:id", authMiddleware, deleteFile);

router.post("/", authMiddleware, uploadLimiter, upload.single("file"), uploadFile);


export default router;