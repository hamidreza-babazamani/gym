/**
 * تست فراموشی و بازیابی رمز عبور.
 * دلیل استفاده: اطمینان از اینکه توکن بازیابی تولید می‌شود و با آن می‌توان رمز جدید تعیین کرد.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";
import { hashToken } from "../src/utils/token.utils";

describe("Password Reset", () => {
  const email = `test-reset-${Date.now()}@example.com`;
  const oldPassword = "Password123";
  const newPassword = "NewPassword123";

  beforeAll(async () => {
    // ثبت‌نام کاربر
    await request(app).post("/api/v1/auth/register").send({
      fullName: "کاربر بازیابی",
      email,
      password: oldPassword,
    });
  });

  it("باید درخواست فراموشی رمز را ثبت کند", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({
      email,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("باید با توکن معتبر، رمز عبور را بازیابی کند", async () => {
    // برای تست، ما مستقیماً یک توکن در دیتابیس می‌سازیم (چون ایمیل واقعی ارسال نمی‌شود)
    const user = await prisma.user.findUnique({ where: { email } });
    const rawToken = "test-reset-token-12345";
    const hashed = hashToken(rawToken);
    
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: hashed,
        expiresAt: new Date(Date.now() + 3600000), // ۱ ساعت بعد
      },
    });

    // ارسال درخواست بازیابی با توکن تستی
    const res = await request(app).post("/api/v1/auth/reset-password").send({
      token: rawToken,
      newPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // تست اینکه رمز جدید کار می‌کند
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email,
      password: newPassword,
    });

    expect(loginRes.status).toBe(200);
  });
});