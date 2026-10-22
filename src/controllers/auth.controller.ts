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
    // به دلایل امنیتی (جلوگیری از افشای وجود حساب)، پیام دقیق نمی‌دهیم
    throw new ApiError(400, "امکان ثبت‌نام با این اطلاعات وجود ندارد. اگر قبلاً ثبت‌نام کرده‌اید، رمز خود را بازیابی کنید.");
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
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashedToken },
    include: { user: { include: { roles: true } } },
  });

  if (!session) {
    throw new ApiError(401, "توکن تازه‌سازی نامعتبر یا منقضی شده است.");
  }

  // تشخیص استفاده مجدد (Reuse Detection)
  if (session.revokedAt) {
    // توکن قبلاً باطل شده، پس احتمالاً دزدیده شده. تمام نشست‌های کاربر را باطل می‌کنیم.
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

// تغییر رمز عبور توسط کاربر لاگین‌شده
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    throw new ApiError(401, "احراز هویت انجام نشده است.");
  }

  // دریافت کاربر از دیتابیس
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "کاربر پیدا نشد.");
  }

  // بررسی صحت رمز عبور فعلی
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(400, "رمز عبور فعلی صحیح نیست.");
  }

  // هش کردن رمز جدید
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // آپدیت رمز عبور و ثبت زمان تغییر آن
  await prisma.user.update({
    where: { id: userId },
    data: { 
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date()
    },
  });

  // به دلایل امنیتی، تمام نشست‌های دیگر (روی دستگاه‌های دیگر) را باطل می‌کنیم
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return sendSuccess(res, "رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید.");
});

// درخواست فراموشی رمز عبور
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  // پیدا کردن کاربر
  const user = await prisma.user.findUnique({ where: { email } });

  // طبق استانداردهای امنیتی، حتی اگر کاربر وجود نداشته باشد، پاسخ موفق می‌دهیم 
  // تا از افشای وجود یا عدم وجود حساب جلوگیری شود.
  if (user) {
    const resetToken = generateRefreshToken(); // استفاده از تابع تولید توکن تصادفی
    const hashedToken = hashToken(resetToken);
    
    // انقضا: ۱ ساعت آینده
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // ذخیره توکن در دیتابیس (قبل از این، توکن‌های قبلی کاربر را باطل می‌کنیم)
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedToken,
        expiresAt,
      },
    });

    // در محیط واقعی، اینجا باید توکن را با ایمیل برای کاربر ارسال کنیم.
    // فعلاً به عنوان تست، آن را در کنسول چاپ می‌کنیم.
    console.log(`[TEST] Password reset token for ${email}: ${resetToken}`);
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

  // استفاده از تراکنش برای جلوگیری از Race Condition (درخواست‌های همزمان)
  await prisma.$transaction(async (tx) => {
    // ۱. علامت‌گذاری توکن به عنوان استفاده‌شده
    await tx.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // ۲. آپدیت رمز عبور
    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { 
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date()
      },
    });

    // ۳. باطل کردن تمام نشست‌ها
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

  // اگر شماره موبایل جدیدی فرستاده شده، باید چک کنیم تکراری نباشد
  if (phone) {
    const duplicatePhone = await prisma.user.findUnique({
      where: { phone },
    });
    if (duplicatePhone && duplicatePhone.id !== userId) {
      throw new ApiError(409, "این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است.");
    }
  }

  // آپدیت اطلاعات کاربر
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