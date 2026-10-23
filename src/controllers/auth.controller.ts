/**
 * کنترلرهای احراز هویت.
 * دلیل اصلاح: اضافه شدن تأیید ایمیل و ارسال مجدد لینک تأیید.
 */
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { generateAccessToken, generateRefreshToken, hashToken } from "../utils/token.utils";
import { env } from "../config/env";

// تابع کمکی برای ایجاد نشست جدید (ثبت در دیتابیس)
const createSession = async (userId: string, req: Request) => {
  const refreshToken = generateRefreshToken();
  const hashedToken = hashToken(refreshToken);
  
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

// ثبت‌نام کاربر جدید (با ایجاد توکن تأیید ایمیل)
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, phone, password } = req.body;

  const duplicate = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (duplicate) {
    throw new ApiError(400, "امکان ثبت‌نام با این اطلاعات وجود ندارد. اگر قبلاً ثبت‌نام کرده‌اید، رمز خود را بازیابی کنید.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash,
      roles: { create: { role: "STUDENT" } },
    },
    include: { roles: true },
  });

  // ساخت توکن تأیید ایمیل
  const verificationToken = generateRefreshToken();
  const hashedToken = hashToken(verificationToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // ۲۴ ساعت

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      email: user.email,
      tokenHash: hashedToken,
      expiresAt,
    },
  });

  if (env.NODE_ENV === "development") {
    console.log(`[DEV ONLY] Email verification token for ${email}: ${verificationToken}`);
  }

  return sendSuccess(
    res,
    "ثبت‌نام با موفقیت انجام شد. لطفاً ایمیل خود را تأیید کنید.",
    { userId: user.id },
    201
  );
});

// ورود با ایمیل
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (!user) {
    throw new ApiError(401, "اطلاعات ورود صحیح نیست.");
  }

  // بررسی قفل بودن حساب
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new ApiError(429, `حساب کاربری شما به دلیل تلاش‌های ناموفق قفل شده است. لطفاً ${remainingMinutes} دقیقه دیگر تلاش کنید.`);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const newFailedCount = user.failedLoginCount + 1;
    const lockDuration = 15 * 60 * 1000;

    const updateData: any = { failedLoginCount: newFailedCount };

    if (newFailedCount >= 5) {
      updateData.lockedUntil = new Date(Date.now() + lockDuration);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    throw new ApiError(401, "اطلاعات ورود صحیح نیست.");
  }

  // بررسی وضعیت حساب
  if (user.status === "PENDING_VERIFICATION") {
    throw new ApiError(403, "لطفاً ابتدا ایمیل خود را تأیید کنید.");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "حساب کاربری غیرفعال است.");
  }

  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  const roles = user.roles.map((item) => item.role);
  const accessToken = generateAccessToken(user.id, roles);
  const refreshToken = await createSession(user.id, req);

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
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashedToken },
    include: { user: { include: { roles: true } } },
  });

  if (!session) {
    throw new ApiError(401, "توکن تازه‌سازی نامعتبر یا منقضی شده است.");
  }

  if (session.revokedAt) {
    await prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(401, "استفاده غیرمجاز شناسایی شد. لطفاً دوباره وارد شوید.");
  }

  if (session.expiresAt < new Date()) {
    throw new ApiError(401, "توکن تازه‌سازی منقضی شده است.");
  }

  if (session.user.status !== "ACTIVE") {
    throw new ApiError(403, "حساب کاربری غیرفعال است.");
  }

  const updatedCount = await prisma.session.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (updatedCount.count === 0) {
    throw new ApiError(401, "توکن تازه‌سازی قبلاً استفاده شده است.");
  }

  const newRefreshToken = await createSession(session.user.id, req);
  const roles = session.user.roles.map((item) => item.role);
  const newAccessToken = generateAccessToken(session.user.id, roles);

  return sendSuccess(res, "توکن با موفقیت تازه‌سازی شد.", {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// خروج از حساب کاربری
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "توکن تازه‌سازی ارسال نشده است.");
  }

  const hashedToken = hashToken(refreshToken);

  await prisma.session.updateMany({
    where: { refreshTokenHash: hashedToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return sendSuccess(res, "خروج با موفقیت انجام شد.");
});

// تغییر رمز عبور
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    throw new ApiError(401, "احراز هویت انجام نشده است.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(404, "کاربر پیدا نشد.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(400, "رمز عبور فعلی صحیح نیست.");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { 
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date()
    },
  });

  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return sendSuccess(res, "رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید.");
});

// درخواست فراموشی رمز عبور
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const resetToken = generateRefreshToken();
    const hashedToken = hashToken(resetToken);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedToken,
        expiresAt,
      },
    });

    if (env.NODE_ENV === "development") {
      console.log(`[DEV ONLY] Password reset token for ${email}: ${resetToken}`);
    }
  }

  return sendSuccess(res, "اگر این ایمیل در سیستم ثبت شده باشد، لینک بازیابی ارسال خواهد شد.");
});

// تنظیم رمز عبور جدید با توکن
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const hashedToken = hashToken(token);

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashedToken },
  });

  if (!resetRecord || resetRecord.expiresAt < new Date() || resetRecord.usedAt) {
    throw new ApiError(400, "توکن بازیابی نامعتبر یا منقضی شده است.");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    const markUsed = await tx.passwordResetToken.updateMany({
      where: { id: resetRecord.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (markUsed.count === 0) {
      throw new ApiError(400, "توکن بازیابی قبلاً استفاده شده است.");
    }

    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newPasswordHash, passwordChangedAt: new Date() },
    });

    await tx.session.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  return sendSuccess(res, "رمز عبور با موفقیت بازیابی شد. لطفاً وارد شوید.");
});

// ویرایش پروفایل کاربر
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { fullName, phone } = req.body;

  if (!userId) {
    throw new ApiError(401, "احراز هویت انجام نشده است.");
  }

  if (phone) {
    const duplicatePhone = await prisma.user.findUnique({
      where: { phone },
    });
    if (duplicatePhone && duplicatePhone.id !== userId) {
      throw new ApiError(409, "این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است.");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName && { fullName }),
      ...(phone && { phone }),
    },
  });

  return sendSuccess(res, "پروفایل با موفقیت ویرایش شد.", {
    user: {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
    },
  });
});

// تأیید ایمیل
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const hashedToken = hashToken(token);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashedToken },
  });

  if (!record || record.expiresAt < new Date() || record.usedAt) {
    throw new ApiError(400, "توکن تأیید نامعتبر یا منقضی شده است.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    await tx.user.update({
      where: { id: record.userId },
      data: {
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
  });

  return sendSuccess(res, "ایمیل با موفقیت تأیید شد. اکنون می‌توانید وارد شوید.");
});

// ارسال مجدد لینک تأیید ایمیل
export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status === "ACTIVE") {
    return sendSuccess(res, "اگر این ایمیل در سیستم باشد، لینک تأیید ارسال خواهد شد.");
  }

  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

  const newToken = generateRefreshToken();
  const hashedToken = hashToken(newToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      email: user.email,
      tokenHash: hashedToken,
      expiresAt,
    },
  });

  if (env.NODE_ENV === "development") {
    console.log(`[DEV ONLY] Resent email verification token for ${email}: ${newToken}`);
  }

  return sendSuccess(res, "اگر این ایمیل در سیستم باشد، لینک تأیید ارسال خواهد شد.");
});
// تغییر ایمیل (نیاز به تأیید مجدد)
export const changeEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { newEmail, password } = req.body;

  if (!userId) throw new ApiError(401, "احراز هویت انجام نشده است.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "کاربر پیدا نشد.");

  // بررسی صحت رمز عبور برای امنیت بیشتر
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(400, "رمز عبور صحیح نیست.");
  }

  // بررسی تکراری نبودن ایمیل جدید
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    throw new ApiError(409, "این ایمیل قبلاً ثبت شده است.");
  }

  // تولید توکن تأیید جدید
  const verificationToken = generateRefreshToken();
  const hashedToken = hashToken(verificationToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // حذف توکن‌های قبلی
    await tx.emailVerificationToken.deleteMany({ where: { userId } });

    // آپدیت ایمیل و تغییر وضعیت به PENDING_VERIFICATION
    await tx.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailVerifiedAt: null,
        status: "PENDING_VERIFICATION",
      },
    });

    // ساخت توکن جدید
    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: newEmail,
        tokenHash: hashedToken,
        expiresAt,
      },
    });
  });

  if (env.NODE_ENV === "development") {
    console.log(`[DEV ONLY] Email verification token for ${newEmail}: ${verificationToken}`);
  }

  return sendSuccess(res, "ایمیل شما تغییر کرد. لطفاً ایمیل جدید خود را تأیید کنید.");
});