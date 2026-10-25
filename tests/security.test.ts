/**
 * تست‌های امنیتی بر اساس چک‌لیست OWASP.
 * دلیل استفاده: اطمینان از مقاومت سیستم در برابر حملات رایج.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Security (OWASP)", () => {
  let student1Token: string;
  let student2Token: string;
  let student1Id: string;
  let student2Id: string;

  beforeAll(async () => {
    const email1 = `sec-user1-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر امن ۱", email: email1, password: "Password123" });
    await prisma.user.update({ where: { email: email1 }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const user1 = await prisma.user.findUnique({ where: { email: email1 } });
    student1Id = user1!.id;
    const login1 = await request(app).post("/api/v1/auth/login").send({ email: email1, password: "Password123" });
    student1Token = login1.body.data.accessToken;

    const email2 = `sec-user2-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر امن ۲", email: email2, password: "Password123" });
    await prisma.user.update({ where: { email: email2 }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const user2 = await prisma.user.findUnique({ where: { email: email2 } });
    student2Id = user2!.id;
    const login2 = await request(app).post("/api/v1/auth/login").send({ email: email2, password: "Password123" });
    student2Token = login2.body.data.accessToken;
  });

  // IDOR / BOLA: دسترسی به منابع دیگران
  it("باید از دسترسی به لاگ‌های پیشرفت کاربر دیگر جلوگیری کند (IDOR)", async () => {
    // کاربر ۱ یک لاگ ثبت می‌کند
    await request(app).post("/api/v1/progress/logs").set("Authorization", `Bearer ${student1Token}`).send({ weight: 70 });

    // کاربر ۲ سعی می‌کند لاگ‌های کاربر ۱ را ببیند
    const res = await request(app).get(`/api/v1/progress/logs?userId=${student1Id}`).set("Authorization", `Bearer ${student2Token}`);

    expect(res.status).toBe(403);
  });

  // Mass Assignment: تلاش برای تغییر فیلدهای حساس
  it("باید از تغییر فیلدهای حساس در پروفایل جلوگیری کند (Mass Assignment)", async () => {
    const res = await request(app)
      .patch("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${student1Token}`)
      .send({ fullName: "نام جدید", status: "ACTIVE", roles: ["SUPER_ADMIN"] });

    // فقط fullName باید تغییر کند، نه status یا roles
    expect(res.status).toBe(200);
    const user = await prisma.user.findUnique({ where: { id: student1Id }, include: { roles: true } });
    expect(user?.roles.some(r => r.role === "SUPER_ADMIN")).toBe(false);
  });

  // SQL Injection: ارسال داده‌های مخرب
    it("باید در برابر تلاش برای SQL Injection مقاوم باشد", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "' OR '1'='1", password: "anything" });

    // سیستم باید ورودی مخرب را رد کند (400 از Zod یا 401 از دیتابیس)
    expect([400, 401]).toContain(res.status);
  });

  // JWT Manipulation: تلاش برای جعل توکن
  it("باید توکن جعلی را رد کند", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer FAKE_TOKEN_HERE");

    expect(res.status).toBe(401);
  });

  // Rate Limiting: جلوگیری از Brute-force
  it("باید بعد از چندین تلاش ورود ناموفق، حساب را قفل کند", async () => {
    const email = `sec-lock-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر قفل", email, password: "Password123" });
    await prisma.user.update({ where: { email }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });

    // ۵ بار تلاش ناموفق
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/v1/auth/login").send({ email, password: "WrongPassword" });
    }

    // تلاش ششم باید خطای 429 بده (قفل)
    const res = await request(app).post("/api/v1/auth/login").send({ email, password: "Password123" });
    expect(res.status).toBe(429);
  });

  // XSS: ارسال اسکریپت در ورودی
  it("باید محتوای XSS را به عنوان متن ساده ذخیره کند، نه اجرا", async () => {
    const xssPayload = "<script>alert('xss')</script>";
    const email = `sec-xss-${Date.now()}@example.com`;
    
    const res = await request(app).post("/api/v1/auth/register").send({
      fullName: xssPayload,
      email,
      password: "Password123",
    });

    expect(res.status).toBe(201);
    
    // نام باید به همان صورت (به عنوان متن) ذخیره شده باشد
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.fullName).toBe(xssPayload);
  });
});