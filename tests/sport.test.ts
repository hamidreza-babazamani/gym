/**
 * تست‌های مربوط به مدیریت رشته‌های ورزشی.
 * دلیل استفاده: بررسی دسترسی‌ها (فقط ادمین) و عملکرد صحیح CRUD.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";
import { hashToken } from "../src/utils/token.utils";

describe("Sport Management", () => {
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    // ۱. ساخت یک کاربر ادمین تستی
    const adminEmail = `admin-sport-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "ادمین تست",
      email: adminEmail,
      password: "Password123",
    });
    
    // ارتقا به ادمین (مستقیم در دیتابیس)
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    await prisma.userRole.create({ data: { userId: adminUser!.id, role: "ADMIN" } });
    
    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: "Password123" });
    adminToken = adminLogin.body.data.accessToken;

    // ۲. ساخت یک کاربر عادی (شاگرد) تستی
    const studentEmail = `student-sport-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "شاگرد تست",
      email: studentEmail,
      password: "Password123",
    });
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;
  });

  it("باید به کاربر عادی اجازه ایجاد رشته ندهد (خطای 403)", async () => {
    const res = await request(app)
      .post("/api/v1/sports")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "بدنسازی" });

    expect(res.status).toBe(403);
  });

  it("باید به ادمین اجازه ایجاد رشته بدهد (خطای 201)", async () => {
    const res = await request(app)
      .post("/api/v1/sports")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "بدنسازی تست", description: "توضیحات تست" });

    expect(res.status).toBe(201);
    expect(res.body.data.sport.name).toBe("بدنسازی تست");
  });

  it("باید لیست رشته‌ها را برای کاربران لاگین‌شده برگرداند", async () => {
    const res = await request(app)
      .get("/api/v1/sports")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.sports)).toBe(true);
  });
});