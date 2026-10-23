/**
 * تست‌های مدیریت رشته‌های ورزشی.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Sport Management", () => {
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const adminEmail = `admin-sport-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "ادمین تست", email: adminEmail, password: "Password123" });
    await prisma.user.update({ where: { email: adminEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    await prisma.userRole.create({ data: { userId: adminUser!.id, role: "ADMIN" } });
    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: "Password123" });
    adminToken = adminLogin.body.data.accessToken;

    const studentEmail = `student-sport-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد تست", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;
  });

  it("باید به کاربر عادی اجازه ایجاد رشته ندهد (خطای 403)", async () => {
    const res = await request(app).post("/api/v1/sports").set("Authorization", `Bearer ${studentToken}`).send({ name: "بدنسازی" });
    expect(res.status).toBe(403);
  });

  it("باید به ادمین اجازه ایجاد رشته بدهد (خطای 201)", async () => {
    const uniqueSportName = `بدنسازی تست ${Date.now()}`;
    const res = await request(app).post("/api/v1/sports").set("Authorization", `Bearer ${adminToken}`).send({ name: uniqueSportName, description: "توضیحات تست" });
    expect(res.status).toBe(201);
    expect(res.body.data.sport.name).toBe(uniqueSportName);
  });

  it("باید لیست رشته‌ها را برای کاربران لاگین‌شده برگرداند", async () => {
    const res = await request(app).get("/api/v1/sports").set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.sports)).toBe(true);
  });
});