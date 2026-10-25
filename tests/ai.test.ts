/**
 * تست‌های دستیار هوش مصنوعی (فاز ۱۶).
 * دلیل استفاده: بررسی عملکرد چت با AI، ذخیره تاریخچه و محدودیت‌ها.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("AI Assistant", () => {
  let token: string;

  beforeAll(async () => {
    const email = `user-ai-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر AI", email, password: "Password123" });
    await prisma.user.update({ where: { email }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password: "Password123" });
    token = loginRes.body.data.accessToken;
  });

  it("باید به کاربر پاسخ AI بدهد", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "یک برنامه تمرینی خوب برای من پیشنهاد بده." });

    expect(res.status).toBe(200);
    expect(res.body.data.response).toBeDefined();
    expect(typeof res.body.data.response).toBe("string");
  });

  it("باید تاریخچه مکالمات AI را برگرداند", async () => {
    const res = await request(app)
      .get("/api/v1/ai/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.conversations)).toBe(true);
    expect(res.body.data.conversations.length).toBeGreaterThan(0);
  });

  it("باید از ارسال پیام خالی جلوگیری کند", async () => {
    const res = await request(app)
      .post("/api/v1/ai/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "" });

    expect(res.status).toBe(400);
  });
});