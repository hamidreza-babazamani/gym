/**
 * کنترلرهای مدیریت فایل‌ها.
 * دلیل استفاده: آپلود، دریافت لیست، دانلود و حذف فایل.
 */
import { Response } from "express";
import fs from "fs";
import path from "path";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// تعیین نوع فایل بر اساس MIME Type
const getFileType = (mimeType: string): "IMAGE" | "VIDEO" | "DOCUMENT" => {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
};

// آپلود فایل جدید (با محدودیت تعداد فایل)
export const uploadFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  if (!file) throw new ApiError(400, "فایلی ارسال نشده است.");

  // بررسی محدودیت تعداد فایل (حداکثر ۱۰۰ فایل برای هر کاربر)
  const fileCount = await prisma.file.count({ where: { ownerId: req.user!.id } });
  if (fileCount >= 100) {
    // فایل آپلود شده رو حذف کن
    const filePath = path.join(process.cwd(), "uploads", file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    throw new ApiError(400, "شما به حداکثر تعداد مجاز فایل (۱۰۰) رسیده‌اید.");
  }

  const fileType = getFileType(file.mimetype);

  try {
    const savedFile = await prisma.file.create({
      data: {
        ownerId: req.user!.id,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        type: fileType,
        path: `/uploads/${file.filename}`,
        isPrivate: true,
      },
    });

    return sendSuccess(res, "فایل با موفقیت آپلود شد.", { file: savedFile }, 201);
  } catch (error) {
    const filePath = path.join(process.cwd(), "uploads", file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw error;
  }
});

// دریافت لیست فایل‌های کاربر
export const listFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const files = await prisma.file.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  return sendSuccess(res, "لیست فایل‌ها دریافت شد.", { files });
});

// دانلود یک فایل (با کنترل دسترسی)
export const downloadFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const userId = req.user!.id;

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new ApiError(404, "فایل پیدا نشد.");

  const isAdmin = req.user!.roles.includes("ADMIN") || req.user!.roles.includes("SUPER_ADMIN");
  if (file.isPrivate && file.ownerId !== userId && !isAdmin) {
    throw new ApiError(403, "شما اجازه دسترسی به این فایل را ندارید.");
  }

  const filePath = path.join(process.cwd(), "uploads", file.storedName);
  if (!fs.existsSync(filePath)) throw new ApiError(404, "فایل روی سرور موجود نیست.");

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
  return res.sendFile(filePath);
});

// حذف یک فایل
export const deleteFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const userId = req.user!.id;

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new ApiError(404, "فایل پیدا نشد.");

  const isAdmin = req.user!.roles.includes("ADMIN") || req.user!.roles.includes("SUPER_ADMIN");
  if (file.ownerId !== userId && !isAdmin) {
    throw new ApiError(403, "شما اجازه حذف این فایل را ندارید.");
  }

  // حذف فیزیکی فایل از سرور
  const filePath = path.join(process.cwd(), "uploads", file.storedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  // حذف از دیتابیس
  await prisma.file.delete({ where: { id } });

  return sendSuccess(res, "فایل با موفقیت حذف شد.");
});