/**
 * کنترلرهای مدیریت گروه‌ها.
 * دلیل استفاده: پیاده‌سازی عملیات CRUD برای گروه‌ها و مدیریت اعضا با کنترل ظرفیت.
 */
import { Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// ایجاد گروه جدید (فقط مربی)
export const createGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, capacity } = req.body;
  const coachId = req.user!.id;

  const group = await prisma.group.create({
    data: {
      name,
      description,
      coachId,
      capacity: capacity || 10,
    },
  });

  return sendSuccess(res, "گروه با موفقیت ایجاد شد.", { group }, 201);
});

// دریافت لیست گروه‌های یک مربی
export const listGroups = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const coachId = req.user!.id;

  const groups = await prisma.group.findMany({
    where: { coachId },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return sendSuccess(res, "لیست گروه‌ها دریافت شد.", { groups });
});

// دریافت جزئیات یک گروه
export const getGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const coachId = req.user!.id;

  const group = await prisma.group.findFirst({
    where: { id, coachId },
    include: {
      members: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!group) {
    throw new ApiError(404, "گروه پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  return sendSuccess(res, "جزئیات گروه دریافت شد.", { group });
});

// ویرایش گروه
export const updateGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { name, description, capacity, isActive } = req.body;
  const coachId = req.user!.id;

  const group = await prisma.group.findFirst({ where: { id, coachId } });
  if (!group) {
    throw new ApiError(404, "گروه پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  // اگر ظرفیت جدید کمتر از تعداد اعضای فعلی باشد، خطا بده
  if (capacity !== undefined) {
    const memberCount = await prisma.groupMember.count({ where: { groupId: id, leftAt: null } });
    if (capacity < memberCount) {
      throw new ApiError(400, "ظرفیت جدید نمی‌تواند کمتر از تعداد اعضای فعلی باشد.");
    }
  }

  const updated = await prisma.group.update({
    where: { id },
    data: { name, description, capacity, isActive },
  });

  return sendSuccess(res, "گروه با موفقیت ویرایش شد.", { group: updated });
});

// افزودن عضو به گروه
export const addMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const groupId = String(req.params.id);
  const { userId } = req.body;
  const coachId = req.user!.id;

  const group = await prisma.group.findFirst({ where: { id: groupId, coachId } });
  if (!group) {
    throw new ApiError(404, "گروه پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  // بررسی ظرفیت به صورت اتمیک
  const memberCount = await prisma.groupMember.count({ where: { groupId, leftAt: null } });
  if (memberCount >= group.capacity) {
    throw new ApiError(400, "ظرفیت گروه تکمیل است.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "کاربر پیدا نشد.");
  }

  // بررسی اینکه آیا کاربر قبلاً عضو گروه بوده یا نه
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (existing && !existing.leftAt) {
    throw new ApiError(409, "این کاربر از قبل عضو گروه است.");
  }

  const member = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId } },
    update: { joinedAt: new Date(), leftAt: null },
    create: { groupId, userId },
  });

  return sendSuccess(res, "کاربر با موفقیت به گروه اضافه شد.", { member }, 201);
});

// حذف عضو از گروه
export const removeMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const groupId = String(req.params.id);
  const userId = String(req.params.userId);
  const coachId = req.user!.id;

  const group = await prisma.group.findFirst({ where: { id: groupId, coachId } });
  if (!group) {
    throw new ApiError(404, "گروه پیدا نشد یا شما اجازه دسترسی ندارید.");
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!member || member.leftAt) {
    throw new ApiError(404, "این کاربر عضو فعال گروه نیست.");
  }

  await prisma.groupMember.update({
    where: { id: member.id },
    data: { leftAt: new Date() },
  });

  return sendSuccess(res, "کاربر با موفقیت از گروه حذف شد.");
});