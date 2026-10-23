/**
 * تست فراموشی و بازیابی رمز عبور.
 * دلیل اصلاح: فعال کردن مستقیم کاربر برای دور زدن تأیید ایمیل در تست.
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
    await request(app).post("/api/v1/auth/register").send({
      fullName: "کاربر بازیابی",
      email,
      password: oldPassword,
    });

    // فعال کردن مستقیم کاربر برای تست
    await prisma.user.update({
      where: { email },
      data: { status: "ACTIVE", emailVerifiedAt: new Date() },
    });
  });

  it("باید درخواست فراموشی رمز را ثبت کند", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("باید با توکن معتبر، رمز عبور را بازیابی کند", async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    const rawToken = `test-reset-token-${Date.now()}`;
    const hashed = hashToken(rawToken);
    
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: hashed,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const res = await request(app).post("/api/v1/auth/reset-password").send({
      token: rawToken,
      newPassword,
    });

    expect(res.status).toBe(200);

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email,
      password: newPassword,
    });

    expect(loginRes.status).toBe(200);
  });
});