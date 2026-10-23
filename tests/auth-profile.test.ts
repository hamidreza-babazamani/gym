/**
 * تست ویرایش پروفایل.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Update Profile", () => {
  let accessToken: string;
  const email = `test-profile-${Date.now()}@example.com`;

  beforeAll(async () => {
    await request(app).post("/api/v1/auth/register").send({
      fullName: "نام قدیمی",
      email,
      password: "Password123",
    });

    // فعال کردن مستقیم کاربر
    await prisma.user.update({
      where: { email },
      data: { status: "ACTIVE", emailVerifiedAt: new Date() },
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email,
      password: "Password123",
    });

    accessToken = loginRes.body.data.accessToken;
  });

  it("باید نام و شماره موبایل کاربر را آپدیت کند", async () => {
    const res = await request(app)
      .patch("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fullName: "نام جدید",
        phone: `0912${Date.now().toString().slice(-7)}`,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.fullName).toBe("نام جدید");
  });
});