/**
 * تست تغییر رمز عبور.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Change Password", () => {
  let accessToken: string;
  let refreshToken: string;
  const email = `test-pass-${Date.now()}@example.com`;
  const oldPassword = "Password123";
  const newPassword = "NewPassword123";

  beforeAll(async () => {
    await request(app).post("/api/v1/auth/register").send({
      fullName: "کاربر رمز",
      email,
      password: oldPassword,
    });

    // فعال کردن مستقیم کاربر
    await prisma.user.update({
      where: { email },
      data: { status: "ACTIVE", emailVerifiedAt: new Date() },
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email,
      password: oldPassword,
    });

    accessToken = loginRes.body.data.accessToken;
    refreshToken = loginRes.body.data.refreshToken;
  });

  it("باید رمز عبور را با موفقیت تغییر دهد", async () => {
    const res = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: oldPassword, newPassword });

    expect(res.status).toBe(200);
  });

  it("باید نشست قبلی را باطل کند (توکن تازه‌سازی قبلی کار نکند)", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
  });
});