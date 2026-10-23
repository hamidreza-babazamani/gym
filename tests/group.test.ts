/**
 * تست‌های مربوط به مدیریت گروه‌ها.
 * دلیل استفاده: بررسی دسترسی‌ها، عملکرد صحیح افزودن عضو و کنترل ظرفیت.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Group Management", () => {
  let coachToken: string;
  let studentToken: string;
  let studentId: string;
  let groupId: string;

  beforeAll(async () => {
    // ۱. ساخت مربی
    const coachEmail = `coach-group-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "مربی گروه",
      email: coachEmail,
      password: "Password123",
    });
    const coachUser = await prisma.user.findUnique({ where: { email: coachEmail } });
    await prisma.userRole.create({ data: { userId: coachUser!.id, role: "COACH" } });
    const coachLogin = await request(app).post("/api/v1/auth/login").send({ email: coachEmail, password: "Password123" });
    coachToken = coachLogin.body.data.accessToken;

    // ۲. ساخت شاگرد
    const studentEmail = `student-group-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "شاگرد گروه",
      email: studentEmail,
      password: "Password123",
    });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;
  });

  it("باید به شاگرد اجازه ساخت گروه ندهد (خطای 403)", async () => {
    const res = await request(app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "گروه تست" });

    expect(res.status).toBe(403);
  });

  it("باید به مربی اجازه ساخت گروه بدهد", async () => {
    const res = await request(app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ name: `گروه بدنسازی ${Date.now()}`, capacity: 2 });

    expect(res.status).toBe(201);
    groupId = res.body.data.group.id;
  });

  it("باید عضو را به گروه اضافه کند", async () => {
    const res = await request(app)
      .post(`/api/v1/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ userId: studentId });

    expect(res.status).toBe(201);
  });

  it("باید از پر شدن بیش از ظرفیت جلوگیری کند", async () => {
    // ظرفیت ۲ است. یک عضو داریم. یک شاگرد دیگر اضافه می‌کنیم.
    const student2Email = `student2-group-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "شاگرد دوم",
      email: student2Email,
      password: "Password123",
    });
    const student2 = await prisma.user.findUnique({ where: { email: student2Email } });

    // عضو دوم را اضافه کن (باید موفق باشد)
    await request(app)
      .post(`/api/v1/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ userId: student2!.id });

    // عضو سوم را اضافه کن (باید خطای 400 بدهد)
    const student3Email = `student3-group-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "شاگرد سوم",
      email: student3Email,
      password: "Password123",
    });
    const student3 = await prisma.user.findUnique({ where: { email: student3Email } });

    const res = await request(app)
      .post(`/api/v1/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ userId: student3!.id });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("ظرفیت گروه تکمیل است.");
  });
});