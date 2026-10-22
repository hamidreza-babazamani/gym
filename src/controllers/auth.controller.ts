/**
 * کنترلرهای احراز هویت.
 * دلیل تغییر: اضافه شدن سیستم Refresh Token و ثبت نشست (Session) در دیتابیس.
 */
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { sendSuccess, sendError } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { generateAccessToken, generateRefreshToken, hashToken } from "../utils/token.utils";

// تابع کمکی برای ایجاد نشست جدید (ثبت در دیتابیس)
const createSession = async (userId: string, req: Request) => {
  const refreshToken = generateRefreshToken();
  const hashedToken = hashToken(refreshToken);
  
  // تنظیم انقضا برای ۷ روز آینده
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashedToken,
      expiresAt,
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    },
  });

  return refreshToken;
};

// ثبت‌نام کاربر جدید
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, phone, password } = req.body;

  // بررسی تکراری نبودن ایمیل یا شماره موبایل
  const duplicate = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (duplicate) {
    throw new ApiError(409, "این ایمیل یا شماره موبایل قبلاً ثبت شده است.");
  }

  // هش کردن رمز عبور
  const passwordHash = await bcrypt.hash(password, 12);

  // ایجاد کاربر در دیتابیس
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash,
      roles: { create: { role: "STUDENT" } },
       status: "ACTIVE", // فعلاً برای تست فعال است، در فاز تأیید ایمیل حذف می‌شود
    },
    include: { roles: true },
  });

  const roles = user.roles.map((item) => item.role);
  
  // ساخت توکن‌ها
  const accessToken = generateAccessToken(user.id, roles);
  const refreshToken = await createSession(user.id, req);

  return sendSuccess(
    res,
    "ثبت‌نام با موفقیت انجام شد.",
    {
      user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, roles },
      accessToken,
      refreshToken,
    },
    201
  );
});

// ورود با ایمیل
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // جست‌وجوی کاربر
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  // بررسی وجود کاربر و صحیح بودن رمز عبور
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    // برای جلوگیری از افشای وجود حساب، پیام یکسان برمی‌گردانیم
    throw new ApiError(401, "اطلاعات ورود صحیح نیست.");
  }

  // جلوگیری از ورود حساب‌های غیرفعال
  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "حساب کاربری غیرفعال یا تأیید نشده است.");
  }

  const roles = user.roles.map((item) => item.role);
  
  // ساخت توکن‌ها
  const accessToken = generateAccessToken(user.id, roles);
  const refreshToken = await createSession(user.id, req);

  // آپدیت زمان آخرین ورود
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return sendSuccess(res, "ورود موفقیت‌آمیز بود.", {
    user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, roles },
    accessToken,
    refreshToken,
  });
});

// دریافت اطلاعات کاربر واردشده
export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "احراز هویت انجام نشده است.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      roles: { select: { role: true } },
    },
  });

  if (!user) {
    throw new ApiError(404, "کاربر پیدا نشد.");
  }

  return sendSuccess(res, "اطلاعات کاربر دریافت شد.", {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles: user.roles.map((item) => item.role),
    },
  });
});
// تازه‌سازی توکن دسترسی (Refresh Token)
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "توکن تازه‌سازی ارسال نشده است.");
  }

  const hashedToken = hashToken(refreshToken);

  // پیدا کردن نشست فعال با این توکن
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashedToken },
    include: { user: { include: { roles: true } } },
  });

  // بررسی اینکه نشست وجود دارد، منقضی یا باطل نشده باشد
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new ApiError(401, "توکن تازه‌سازی نامعتبر یا منقضی شده است.");
  }

  // بررسی اینکه کاربر همچنان فعال است
  if (session.user.status !== "ACTIVE") {
    throw new ApiError(403, "حساب کاربری غیرفعال است.");
  }

  // چرخش توکن (ابطال نشست قبلی و ساخت نشست جدید)
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const newRefreshToken = await createSession(session.user.id, req);
  const roles = session.user.roles.map((item) => item.role);
  const newAccessToken = generateAccessToken(session.user.id, roles);

  return sendSuccess(res, "توکن با موفقیت تازه‌سازی شد.", {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});
// خروج از حساب کاربری (ابطال نشست)
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "توکن تازه‌سازی ارسال نشده است.");
  }

  const hashedToken = hashToken(refreshToken);

  // باطل کردن نشست (اگر وجود داشته باشد)
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashedToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return sendSuccess(res, "خروج با موفقیت انجام شد.");
});