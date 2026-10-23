/**
 * کنترلرهای مدیریت رشته‌های ورزشی.
 * دلیل اصلاح: تبدیل نوع req.params.id به رشته (String) برای جلوگیری از خطای TypeScript با Prisma.
 */
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

// دریافت لیست رشته‌های ورزشی (با قابلیت جستجو)
export const listSports = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const sports = await prisma.sport.findMany({
    where: search
      ? {
          name: { contains: String(search), mode: "insensitive" },
        }
      : {},
    orderBy: { sortOrder: "asc" },
  });

  return sendSuccess(res, "لیست رشته‌های ورزشی دریافت شد.", { sports });
});

// دریافت جزئیات یک رشته
export const getSport = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const sport = await prisma.sport.findUnique({
    where: { id },
  });

  if (!sport) {
    throw new ApiError(404, "رشته ورزشی پیدا نشد.");
  }

  return sendSuccess(res, "جزئیات رشته دریافت شد.", { sport });
});

// ایجاد رشته جدید (فقط ادمین)
export const createSport = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, icon, isActive, sortOrder } = req.body;

  const sport = await prisma.sport.create({
    data: {
      name,
      description,
      icon,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder !== undefined ? sortOrder : 0,
    },
  });

  return sendSuccess(res, "رشته ورزشی با موفقیت ایجاد شد.", { sport }, 201);
});

// ویرایش رشته (فقط ادمین)
export const updateSport = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const data = req.body;

  const sport = await prisma.sport.update({
    where: { id },
    data,
  });

  return sendSuccess(res, "رشته ورزشی با موفقیت ویرایش شد.", { sport });
});

// حذف رشته (فقط ادمین)
export const deleteSport = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  await prisma.sport.delete({
    where: { id },
  });

  return sendSuccess(res, "رشته ورزشی با موفقیت حذف شد.");
});