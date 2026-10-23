/**
 * تست‌های مربوط به مدیریت برنامه‌های تمرینی.
 * دلیل اصلاح: ایجاد ارتباط فعال بین مربی و شاگرد در تست، تا مجوز اختصاص برنامه صادر شود.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Program Management", () => {
  let coachToken: string;
  let studentToken: string;
  let studentId: string;
  let exerciseId: string;

  beforeAll(async () => {
    // ۱. ساخت کاربر مربی
    const coachEmail = `coach-prog-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "مربی برنامه",
      email: coachEmail,
      password: "Password123",
    });
    const coachUser = await prisma.user.findUnique({ where: { email: coachEmail } });
    await prisma.userRole.create({ data: { userId: coachUser!.id, role: "COACH" } });
    const coachLogin = await request(app).post("/api/v1/auth/login").send({ email: coachEmail, password: "Password123" });
    coachToken = coachLogin.body.data.accessToken;

    // ۲. ساخت کاربر شاگرد
    const studentEmail = `student-prog-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "شاگرد برنامه",
      email: studentEmail,
      password: "Password123",
    });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    // ۳. ایجاد یک رشته ورزشی و ارتباط فعال بین مربی و شاگرد
    const sport = await prisma.sport.create({ data: { name: `رشته تست ${Date.now()}` } });
    await prisma.coachStudent.create({
      data: {
        coachId: coachUser!.id,
        studentId: studentUser!.id,
        sportId: sport.id,
        status: "ACTIVE",
        initiatedBy: "STUDENT",
      },
    });

    // ۴. ساخت یک تمرین توسط مربی
    const exerciseRes = await request(app)
      .post("/api/v1/programs/exercises")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ name: `پرس سینه ${Date.now()}`, muscleGroup: "سینه" });
    exerciseId = exerciseRes.body.data.exercise.id;
  });

  it("باید به شاگرد اجازه ساخت برنامه ندهد (خطای 403)", async () => {
    const res = await request(app)
      .post("/api/v1/programs")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "برنامه تست" });

    expect(res.status).toBe(403);
  });

  it("باید به مربی اجازه ساخت برنامه، روز و اختصاص به شاگرد بدهد", async () => {
    // ۱. ساخت برنامه
    const programRes = await request(app)
      .post("/api/v1/programs")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ name: `برنامه حجم ${Date.now()}` });
    
    expect(programRes.status).toBe(201);
    const programId = programRes.body.data.program.id;

    // ۲. اضافه کردن روز
    const dayRes = await request(app)
      .post(`/api/v1/programs/${programId}/days`)
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ dayOfWeek: 1, name: "سینه و پشت" });
    
    expect(dayRes.status).toBe(201);
    const dayId = dayRes.body.data.day.id;

    // ۳. اضافه کردن تمرین به روز
    const exerciseAddRes = await request(app)
      .post(`/api/v1/programs/days/${dayId}/exercises`)
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ exerciseId, sets: 4, reps: 12, weight: 60 });

    expect(exerciseAddRes.status).toBe(201);

    // ۴. اختصاص برنامه به شاگرد
    const assignRes = await request(app)
      .post(`/api/v1/programs/${programId}/assign`)
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ studentId });

    expect(assignRes.status).toBe(201);
  });
});