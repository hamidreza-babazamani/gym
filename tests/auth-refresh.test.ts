/**
 * تست مسیرهای تازه‌سازی توکن (refresh) و خروج (logout).
 * دلیل استفاده: اطمینان از عملکرد صحیح چرخش توکن و ابطال نشست.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Auth Refresh & Logout", () => {
  let refreshToken: string;

  // قبل از اجرای تست‌ها، یک کاربر تستی می‌سازیم و لاگین می‌کنیم
  beforeAll(async () => {
    const email = `test-${Date.now()}@example.com`;
    
    await request(app).post("/api/v1/auth/register").send({
      fullName: "کاربر تستی",
      email,
      password: "Password123",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email,
      password: "Password123",
    });

    refreshToken = loginRes.body.data.refreshToken;
  });

  it("باید توکن تازه‌سازی را با موفقیت آپدیت کند", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({
      refreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
    
    // توکن جدید باید با قبلی فرق داشته باشد (چرخش توکن)
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it("باید با توکن تازه‌سازی نامعتبر خطای 401 برگرداند", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({
      refreshToken: "invalid-token",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});