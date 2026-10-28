/**
 * پیکربندی Multer برای آپلود فایل.
 * دلیل استفاده: مدیریت ذخیره‌سازی، محدودیت حجم و بررسی نوع فایل.
 */
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs"; // F-16 fix: import fs
import { ApiError } from "../utils/ApiError";

// F-16 fix: Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// تنظیم محل ذخیره‌سازی و نام‌گذاری امن فایل
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir); // F-16 fix: use the ensured directory
  },
  filename: (_req, file, cb) => {
    // تولید نام امن با UUID و پسوند اصلی
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// فیلتر بررسی نوع فایل (فعلاً تصویر و ویدیو)
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    "image/jpeg", "image/png", "image/webp",
    "video/mp4", "video/webm",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "نوع فایل مجاز نیست. فقط تصویر، ویدیو و PDF قابل قبول است."));
  }
};

// تنظیمات نهایی Multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // حداکثر ۵۰ مگابایت
  },
});