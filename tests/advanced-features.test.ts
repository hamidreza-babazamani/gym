/**
 * تست‌های قابلیت‌های پیشرفته (فازهای ۴، ۹ و ۱۰).
 * دلیل اصلاح: جابجایی تست موبایل به قبل از تغییر ایمیل برای جلوگیری از باطل شدن توکن.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Advanced Features", () => {
  let coachToken: string;
  let studentToken: string;
  let studentId: string;
  let coachId: string;
  let programId: string;
  let groupId: string;

  beforeAll(async () => {
    const coachEmail = `coach-adv-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "مربی پیشرفته", email: coachEmail, password: "Password123" });
    await prisma.user.update({ where: { email: coachEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const coachUser = await prisma.user.findUnique({ where: { email: coachEmail } });
    coachId = coachUser!.id;
    await prisma.userRole.create({ data: { userId: coachId, role: "COACH" } });
    const coachLogin = await request(app).post("/api/v1/auth/login").send({ email: coachEmail, password: "Password123" });
    coachToken = coachLogin.body.data.accessToken;

    const studentEmail = `student-adv-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد پیشرفته", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    const sport = await prisma.sport.create({ data: { name: `رشته ادو ${Date.now()}-${Math.random()}` } });
    await prisma.coachStudent.create({ data: { coachId, studentId, sportId: sport.id, status: "ACTIVE", initiatedBy: "STUDENT" } });

    const programRes = await request(app).post("/api/v1/programs").set("Authorization", `Bearer ${coachToken}`).send({ name: `برنامه ادو ${Date.now()}` });
    programId = programRes.body.data.program.id;

    const groupRes = await request(app).post("/api/v1/groups").set("Authorization", `Bearer ${coachToken}`).send({ name: `گروه ادو ${Date.now()}`, capacity: 5 });
    groupId = groupRes.body.data.group.id;
  });

  // === تست تأیید موبایل (اول، چون توکن رو باطل نمی‌کنه) ===
  it("باید توکن تأیید شماره موبایل را تولید کند", async () => {
    const res = await request(app)
      .post("/api/v1/auth/request-phone-verification")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ phone: `0912${Date.now().toString().slice(-7)}` });
    expect(res.status).toBe(200);
  });

  // === تست تغییر ایمیل (بعد از موبایل) ===
  it("باید ایمیل کاربر را تغییر دهد و به حالت PENDING_VERIFICATION برگرداند", async () => {
    const newEmail = `new-email-${Date.now()}@example.com`;
    const res = await request(app)
      .patch("/api/v1/auth/change-email")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ newEmail, password: "Password123" });
    expect(res.status).toBe(200);
    const user = await prisma.user.findUnique({ where: { email: newEmail } });
    expect(user?.status).toBe("PENDING_VERIFICATION");
  });

  // === تست نسخه‌بندی ===
  it("باید یک نسخه جدید هنگام آپدیت برنامه ایجاد کند", async () => {
    await request(app).patch(`/api/v1/programs/${programId}`).set("Authorization", `Bearer ${coachToken}`).send({ name: "نام جدید برنامه" });
    const res = await request(app).get(`/api/v1/programs/${programId}/versions`).set("Authorization", `Bearer ${coachToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.versions.length).toBeGreaterThan(0);
  });

  // === تست override گروه ===
  it("باید تغییرات اختصاصی برای عضو گروه ثبت کند", async () => {
    await request(app).post(`/api/v1/groups/${groupId}/members`).set("Authorization", `Bearer ${coachToken}`).send({ userId: studentId });
    const res = await request(app).post(`/api/v1/groups/${groupId}/members/${studentId}/override`).set("Authorization", `Bearer ${coachToken}`).send({ overrides: { sets: 5, weight: 80 } });
    expect(res.status).toBe(200);
    const getRes = await request(app).get(`/api/v1/groups/${groupId}/members/${studentId}/override`).set("Authorization", `Bearer ${coachToken}`);
    expect(getRes.body.data.override.overrides.sets).toBe(5);
  });

  // === تست اختصاص دسته‌ای ===
  it("باید برنامه را به چند ورزشکار اختصاص دهد", async () => {
    const student2Email = `student2-adv-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد دوم", email: student2Email, password: "Password123" });
    await prisma.user.update({ where: { email: student2Email }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const student2 = await prisma.user.findUnique({ where: { email: student2Email } });
    const sport2 = await prisma.sport.create({ data: { name: `رشته ادو ۲ ${Date.now()}-${Math.random()}` } });
    await prisma.coachStudent.create({ data: { coachId, studentId: student2!.id, sportId: sport2.id, status: "ACTIVE", initiatedBy: "STUDENT" } });
    const res = await request(app).post(`/api/v1/programs/${programId}/assign-bulk`).set("Authorization", `Bearer ${coachToken}`).send({ studentIds: [studentId, student2!.id] });
    expect(res.status).toBe(201);
    expect(res.body.data.results.success).toBe(2);
  });
}); 