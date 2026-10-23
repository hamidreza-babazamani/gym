/**
 * تست‌های مدیریت گروه‌ها.
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
  let programId: string;

  beforeAll(async () => {
    const coachEmail = `coach-group-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "مربی گروه", email: coachEmail, password: "Password123" });
    await prisma.user.update({ where: { email: coachEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const coachUser = await prisma.user.findUnique({ where: { email: coachEmail } });
    await prisma.userRole.create({ data: { userId: coachUser!.id, role: "COACH" } });
    const coachLogin = await request(app).post("/api/v1/auth/login").send({ email: coachEmail, password: "Password123" });
    coachToken = coachLogin.body.data.accessToken;

    const studentEmail = `student-group-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد گروه", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    const programRes = await request(app).post("/api/v1/programs").set("Authorization", `Bearer ${coachToken}`).send({ name: `برنامه تست ${Date.now()}` });
    programId = programRes.body.data.program.id;
  });

  it("باید به شاگرد اجازه ساخت گروه ندهد (خطای 403)", async () => {
    const res = await request(app).post("/api/v1/groups").set("Authorization", `Bearer ${studentToken}`).send({ name: "گروه تست" });
    expect(res.status).toBe(403);
  });

  it("باید به مربی اجازه ساخت گروه بدهد", async () => {
    const res = await request(app).post("/api/v1/groups").set("Authorization", `Bearer ${coachToken}`).send({ name: `گروه بدنسازی ${Date.now()}`, capacity: 2 });
    expect(res.status).toBe(201);
    groupId = res.body.data.group.id;
  });

  it("باید برنامه را به گروه اختصاص دهد", async () => {
    const res = await request(app).post(`/api/v1/groups/${groupId}/assign-program`).set("Authorization", `Bearer ${coachToken}`).send({ programId });
    expect(res.status).toBe(201);
  });

  it("باید عضو را به گروه اضافه کند", async () => {
    const res = await request(app).post(`/api/v1/groups/${groupId}/members`).set("Authorization", `Bearer ${coachToken}`).send({ userId: studentId });
    expect(res.status).toBe(201);
  });

  it("باید از پر شدن بیش از ظرفیت جلوگیری کند", async () => {
    const student2Email = `student2-group-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد دوم", email: student2Email, password: "Password123" });
    await prisma.user.update({ where: { email: student2Email }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const student2 = await prisma.user.findUnique({ where: { email: student2Email } });

    await request(app).post(`/api/v1/groups/${groupId}/members`).set("Authorization", `Bearer ${coachToken}`).send({ userId: student2!.id });

    const student3Email = `student3-group-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد سوم", email: student3Email, password: "Password123" });
    await prisma.user.update({ where: { email: student3Email }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const student3 = await prisma.user.findUnique({ where: { email: student3Email } });

    const res = await request(app).post(`/api/v1/groups/${groupId}/members`).set("Authorization", `Bearer ${coachToken}`).send({ userId: student3!.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("ظرفیت گروه تکمیل است.");
  });

  it("باید گروه را غیرفعال کند", async () => {
    const res = await request(app).delete(`/api/v1/groups/${groupId}`).set("Authorization", `Bearer ${coachToken}`);
    expect(res.status).toBe(200);
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    expect(group?.isActive).toBe(false);
  });
});