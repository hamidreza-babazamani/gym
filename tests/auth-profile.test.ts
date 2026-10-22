/**
 * تست ویرایش پروفایل.
 * دلیل استفاده: اطمینان از اینکه کاربر می‌تواند نام و شماره موبایل خود را آپدیت کند.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Update Profile", () => {
  let accessToken: string;
  const email = `test-profile-${Date.now()}@example.com`;

  beforeAll(async () => {
    // ثبت‌نام و لاگین برای گرفتن توکن
    await request(app).post("/api/v1/auth/register").send({
      fullName: "نام قدیمی",
      email,
      password: "Password123",
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
        phone: `0912${Date.now().toString().slice(-7)}`, // شماره تصادفی برای جلوگیری از خطای تکراری,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.fullName).toBe("نام جدید");
    expect(res.body.data.user.phone).toBeDefined();
  });
});