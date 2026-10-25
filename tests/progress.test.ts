/**
 * تست‌های پیشرفت و گزارش‌ها (فاز ۱۴).
 * دلیل استفاده: بررسی ثبت وزن، یادداشت مربی و مقایسه پیشرفت.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Progress Tracking", () => {
  let coachToken: string;
  let studentToken: string;
  let coachId: string;
  let studentId: string;

  beforeAll(async () => {
    // ۱. ساخت مربی
    const coachEmail = `coach-prog-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "مربی پیشرفت", email: coachEmail, password: "Password123" });
    await prisma.user.update({ where: { email: coachEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const coachUser = await prisma.user.findUnique({ where: { email: coachEmail } });
    coachId = coachUser!.id;
    await prisma.userRole.create({ data: { userId: coachId, role: "COACH" } });
    const coachLogin = await request(app).post("/api/v1/auth/login").send({ email: coachEmail, password: "Password123" });
    coachToken = coachLogin.body.data.accessToken;

    // ۲. ساخت شاگرد
    const studentEmail = `student-prog-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد پیشرفت", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    // ۳. ایجاد ارتباط فعال بین مربی و شاگرد
    const sport = await prisma.sport.create({ data: { name: `رشته پیشرفت ${Date.now()}` } });
    await prisma.coachStudent.create({
      data: { coachId, studentId, sportId: sport.id, status: "ACTIVE", initiatedBy: "STUDENT" },
    });
  });

  it("باید به شاگرد اجازه ثبت لاگ پیشرفت (وزن) را بدهد", async () => {
    const res = await request(app)
      .post("/api/v1/progress/logs")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ weight: 75.5, bodyFat: 15 });

    expect(res.status).toBe(201);
    expect(res.body.data.log.weight).toBe(75.5);
  });

  it("باید به مربی اجازه ثبت یادداشت برای شاگرد را بدهد", async () => {
    const res = await request(app)
      .post("/api/v1/progress/notes")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ studentId, content: "پیشرفت خوبی داشتی، ادامه بده!" });

    expect(res.status).toBe(201);
    expect(res.body.data.note.content).toBe("پیشرفت خوبی داشتی، ادامه بده!");
  });

  it("باید تاریخچه لاگ‌های پیشرفت را برگرداند", async () => {
    const res = await request(app)
      .get(`/api/v1/progress/logs?userId=${studentId}`)
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
  });

  it("باید از دسترسی غیرمجاز به لاگ‌های ورزشکار دیگر جلوگیری کند", async () => {
    // ساخت کاربر سوم
    const otherEmail = `other-prog-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر دیگر", email: otherEmail, password: "Password123" });
    await prisma.user.update({ where: { email: otherEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const otherLogin = await request(app).post("/api/v1/auth/login").send({ email: otherEmail, password: "Password123" });
    const otherToken = otherLogin.body.data.accessToken;

    const res = await request(app)
      .get(`/api/v1/progress/logs?userId=${studentId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});