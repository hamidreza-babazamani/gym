/**
 * مسیرهای مربوط به مدیریت فایل‌ها.
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

router.post("/", authMiddleware, uploadLimiter, upload.single("file"), uploadFile);
router.get("/", authMiddleware, listFiles);
router.get("/:id/download", authMiddleware, downloadFile);
router.delete("/:id", authMiddleware, deleteFile);

export default router;