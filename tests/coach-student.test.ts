/**
 * تست‌های ارتباط مربی و شاگرد (فاز ۷).
 * دلیل استفاده: بررسی ارسال درخواست، تأیید، لغو و پایان ارتباط.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Coach-Student Relationship", () => {
  let coachToken: string;
  let studentToken: string;
  let coachId: string;
  let studentId: string;
  let sportId: string;
  let requestId: string;

  beforeAll(async () => {
    // ۱. ساخت مربی
    const coachEmail = `coach-rel-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "مربی ارتباط", email: coachEmail, password: "Password123" });
    await prisma.user.update({ where: { email: coachEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const coachUser = await prisma.user.findUnique({ where: { email: coachEmail } });
    coachId = coachUser!.id;
    await prisma.userRole.create({ data: { userId: coachId, role: "COACH" } });
    const coachLogin = await request(app).post("/api/v1/auth/login").send({ email: coachEmail, password: "Password123" });
    coachToken = coachLogin.body.data.accessToken;

    // ۲. ساخت شاگرد
    const studentEmail = `student-rel-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد ارتباط", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    // ۳. ساخت یک رشته ورزشی
    const sport = await prisma.sport.create({ data: { name: `رشته ارتباط ${Date.now()}` } });
    sportId = sport.id;
  });

  it("باید لیست مربیان را برای شاگرد برگرداند", async () => {
    const res = await request(app)
      .get("/api/v1/coaches")
      .set("Authorization", `Bearer ${studentToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.coaches.length).toBeGreaterThan(0);
  });

  it("باید به شاگرد اجازه ارسال درخواست به مربی بدهد", async () => {
    const res = await request(app)
      .post(`/api/v1/coaches/${coachId}/request`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ sportId });

    expect(res.status).toBe(201);
    requestId = res.body.data.requestId;
    expect(res.body.data.status).toBe("PENDING");
  });

  it("باید به مربی اجازه تأیید درخواست را بدهد", async () => {
    const res = await request(app)
      .patch(`/api/v1/coach-requests/${requestId}`)
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ decision: "APPROVE" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ACTIVE");
  });

  it("باید به شاگرد اجازه پایان دادن به ارتباط را بدهد", async () => {
    const relation = await prisma.coachStudent.findFirst({
      where: { coachId, studentId, status: "ACTIVE" }
    });

    const res = await request(app)
      .patch(`/api/v1/coach-students/${relation!.id}/end`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ reason: "پایان همکاری تستی" });

    expect(res.status).toBe(200);
  });

    it("باید از ارسال درخواست تکراری جلوگیری کند", async () => {
    // رکورد قبلی (که در تست پایان ارتباط، وضعیتش ENDED شده) را به PENDING برمی‌گردانیم
    const existingRelation = await prisma.coachStudent.findFirst({
      where: { coachId, studentId, sportId }
    });

    if (existingRelation) {
      await prisma.coachStudent.update({
        where: { id: existingRelation.id },
        data: { status: "PENDING", leftAt: null } // برگرداندن به وضعیت اولیه
      });
    }

    // حالا درخواست جدید می‌فرستیم (باید خطای 409 بده)
    const res = await request(app)
      .post(`/api/v1/coaches/${coachId}/request`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ sportId });

    expect(res.status).toBe(409);
  });
});