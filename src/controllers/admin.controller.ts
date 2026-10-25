/**
 * کنترلرهای مدیریتی.
 * دلیل اصلاح: اعتبارسنجی تاریخ در financialReport و ثبت Audit Log در همه عملیات.
 */
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { createAuditLog } from "../utils/audit";

// تابع کمکی برای اعتبارسنجی تاریخ
const parseDate = (value: unknown, fieldName: string): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (isNaN(date.getTime())) {
    throw new ApiError(400, `تاریخ ${fieldName} نامعتبر است.`);
  }
  return date;
};

// تبدیل شاگرد به مربی؛ فقط توسط Super Admin
export const promoteToCoach = asyncHandler(async (req: Request, res: Response) => {
  const rawUserId = req.params.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const actorId = (req as any).user?.id;

  if (!userId) throw new ApiError(400, "شناسه کاربر معتبر نیست.");
  if (!actorId) throw new ApiError(401, "احراز هویت انجام نشده است.");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user) throw new ApiError(404, "کاربر پیدا نشد.");
  if (user.roles.some((item) => item.role === "SUPER_ADMIN")) {
    throw new ApiError(403, "نقش Super Admin از این مسیر قابل تغییر نیست.");
  }
  if (user.roles.some((item) => item.role === "COACH")) {
    throw new ApiError(409, "این کاربر از قبل مربی است.");
  }

  await prisma.userRole.create({ data: { userId: user.id, role: "COACH" } });

  await createAuditLog({
    actorId,
    action: "USER_PROMOTED_TO_COACH",
    entity: "User",
    entityId: user.id,
    oldValue: { roles: user.roles.map(r => r.role) },
    newValue: { roles: [...user.roles.map(r => r.role), "COACH"] },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  return sendSuccess(res, "کاربر با موفقیت به مربی تبدیل شد.", { userId: user.id, role: "COACH" });
});

// دریافت لیست کاربران
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, status, role } = req.query;
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const validStatuses = ["ACTIVE", "SUSPENDED", "DELETED", "PENDING_VERIFICATION"];
  if (status && !validStatuses.includes(String(status))) {
    throw new ApiError(400, "وضعیت نامعتبر است.");
  }

  const validRoles = ["STUDENT", "COACH", "ADMIN", "SUPER_ADMIN"];
  if (role && !validRoles.includes(String(role))) {
    throw new ApiError(400, "نقش نامعتبر است.");
  }

  const users = await prisma.user.findMany({
    where: {
      ...(search ? { OR: [{ fullName: { contains: String(search), mode: "insensitive" } }, { email: { contains: String(search), mode: "insensitive" } }] } : {}),
      ...(status ? { status: status as any } : {}),
      ...(role ? { roles: { some: { role: role as any } } } : {}),
    },
    select: {
      id: true, fullName: true, email: true, phone: true, status: true, createdAt: true,
      roles: { select: { role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = users.length === limit ? users[users.length - 1].id : null;
  return sendSuccess(res, "لیست کاربران دریافت شد.", { users, nextCursor });
});

// تغییر وضعیت کاربر
export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  const { status } = req.body;
  const actorId = (req as any).user?.id;
  const actorRoles = (req as any).user?.roles || [];

  if (!actorId) throw new ApiError(401, "احراز هویت انجام نشده است.");
  if (!["ACTIVE", "SUSPENDED", "DELETED"].includes(status)) {
    throw new ApiError(400, "وضعیت نامعتبر است.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user) throw new ApiError(404, "کاربر پیدا نشد.");

  // جلوگیری از تعلیق Super Admin توسط ادمین عادی
  if (user.roles.some(r => r.role === "SUPER_ADMIN") && !actorRoles.includes("SUPER_ADMIN")) {
    throw new ApiError(403, "شما نمی‌توانید وضعیت Super Admin را تغییر دهید.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status, ...(status === "DELETED" ? { deletedAt: new Date() } : {}) },
  });

  await createAuditLog({
    actorId, action: "USER_STATUS_CHANGED", entity: "User", entityId: userId,
    oldValue: { status: user.status }, newValue: { status },
    ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });

  return sendSuccess(res, "وضعیت کاربر تغییر کرد.", { userId: updated.id, status: updated.status });
});

// گزارش مالی (با اعتبارسنجی تاریخ)
export const financialReport = asyncHandler(async (req: Request, res: Response) => {
  const fromDate = parseDate(req.query.from, "شروع");
  const toDate = parseDate(req.query.to, "پایان");

  if (fromDate && toDate && fromDate > toDate) {
    throw new ApiError(400, "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.");
  }

  const dateFilter: any = {};
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = toDate;

  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const [totalOrders, paidOrders, failedOrders, totalRevenue] = await Promise.all([
    prisma.order.count({ where: hasDateFilter ? { createdAt: dateFilter } : {} }),
    prisma.order.count({ where: { status: "PAID", ...(hasDateFilter ? { createdAt: dateFilter } : {}) } }),
    prisma.order.count({ where: { status: "FAILED", ...(hasDateFilter ? { createdAt: dateFilter } : {}) } }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS", ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
      _sum: { amount: true },
    }),
  ]);

  return sendSuccess(res, "گزارش مالی دریافت شد.", {
    totalOrders, paidOrders, failedOrders, totalRevenue: totalRevenue._sum.amount || 0,
  });
});

// گزارش آماری
export const statsReport = asyncHandler(async (_req: Request, res: Response) => {
   const [totalUsers, totalCoaches, totalStudents, totalPrograms, totalGroups, totalSports] = await Promise.all([
    prisma.user.count({ where: { status: { not: "DELETED" } } }), // فقط کاربران غیرحذف‌شده
    prisma.userRole.count({ where: { role: "COACH" } }),
    prisma.userRole.count({ where: { role: "STUDENT" } }),
    prisma.program.count(),
    prisma.group.count({ where: { isActive: true } }),
    prisma.sport.count({ where: { isActive: true } }),
  ]);

  return sendSuccess(res, "گزارش آماری دریافت شد.", {
    totalUsers, totalCoaches, totalStudents, totalPrograms, totalGroups, totalSports,
  });
});

// دریافت تاریخچه Audit Log (فقط Super Admin)
export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { action, entity, actorId } = req.query;
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action: String(action) } : {}),
      ...(entity ? { entity: String(entity) } : {}),
      ...(actorId ? { actorId: String(actorId) } : {}),
    },
    include: { actor: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;
  return sendSuccess(res, "تاریخچه عملیات دریافت شد.", { logs, nextCursor });
});