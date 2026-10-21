
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { sendError, sendSuccess } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// ساخت Access Token برای کاربر
const createAccessToken = (userId: string, roles: string[]) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ roles }, secret, {
    subject: userId,
    //expiresIn: "15m",
  });
};

// ثبت‌نام کاربر جدید
export const register = async (req: Request, res: Response) => {
  const { fullName, email, phone, password } = req.body ?? {};

  // بررسی اطلاعات ضروری
  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return sendError(
      res,
      "نام و رمز عبور معتبر وارد کنید؛ رمز باید حداقل ۸ کاراکتر باشد.",
      400
    );
  }

  // حداقل ایمیل یا شماره موبایل باید ارائه شود
  const normalizedEmail =
    typeof email === "string" && email.trim()
      ? email.trim().toLowerCase()
      : null;

  const normalizedPhone =
    typeof phone === "string" && phone.trim()
      ? phone.trim()
      : null;

  if (!normalizedEmail && !normalizedPhone) {
    return sendError(res, "ایمیل یا شماره موبایل الزامی است.", 400);
  }

  if (
    normalizedEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return sendError(res, "فرمت ایمیل معتبر نیست.", 400);
  }

  if (
    normalizedPhone &&
    !/^\+?[\d\s()-]{7,20}$/.test(normalizedPhone)
  ) {
    return sendError(res, "فرمت شماره موبایل معتبر نیست.", 400);
  }

  // بررسی تکراری نبودن ایمیل یا شماره موبایل
  const duplicate = await prisma.user.findFirst({
    where: {
      OR: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    },
  });

  if (duplicate) {
    return sendError(
      res,
      "این ایمیل یا شماره موبایل قبلاً ثبت شده است.",
      409
    );
  }

  // هش کردن رمز عبور قبل از ذخیره
  const passwordHash = await bcrypt.hash(password, 12);

  // نقش کاربر فقط در سمت سرور تعیین می‌شود
  const user = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      roles: {
        create: { role: "STUDENT" },
      },
    },
    include: { roles: true },
  });

  const roles = user.roles.map((item) => item.role);
  const accessToken = createAccessToken(user.id, roles);

  return sendSuccess(
    res,
    "ثبت‌نام با موفقیت انجام شد.",
    {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        roles,
      },
      accessToken,
    },
    201
  );
};

// ورود با ایمیل یا شماره موبایل
export const login = async (req: Request, res: Response) => {
  // دریافت ایمیل و رمز عبور از درخواست
  const { email, password } = req.body ?? {};

  // بررسی معتبر بودن اطلاعات ورودی
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return sendError(res, "اطلاعات ورود ناقص است.", 400);
  }

  // جست‌وجوی کاربر با ایمیل
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { roles: true },
  });

  // بررسی وجود کاربر و صحیح بودن رمز عبور
  if (
    !user ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    return sendError(res, "اطلاعات ورود صحیح نیست.", 401);
  }

  // جلوگیری از ورود حساب‌های غیرفعال
  if (user.status !== "ACTIVE") {
    return sendError(res, "حساب کاربری غیرفعال است.", 403);
  }

  // استخراج نقش‌های کاربر و ساخت توکن
  const roles = user.roles.map((item) => item.role);
  const accessToken = createAccessToken(user.id, roles);

  // ارسال پاسخ موفق
  return sendSuccess(res, "ورود موفقیت‌آمیز بود.", {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles,
    },
    accessToken,
  });
};

// دریافت اطلاعات کاربر واردشده
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  // دریافت شناسه کاربر از Middleware احراز هویت
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, "احراز هویت انجام نشده است.", 401);
  }

  // دریافت اطلاعات به‌روز کاربر از دیتابیس
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      roles: {
        select: { role: true },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return sendError(res, "حساب کاربری معتبر یا فعال نیست.", 401);
  }

  // استخراج نقش‌های کاربر
  const roles = user.roles.map((item) => item.role);

  return sendSuccess(res, "اطلاعات کاربر دریافت شد.", {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles,
    },
  });
};