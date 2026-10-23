/**
 * تست‌های مدیریت عضویت‌ها.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Membership Management", () => {
  let adminToken: string;
  let studentToken: string;
  let studentId: string;
  let sportId: string;

  beforeAll(async () => {
    const adminEmail = `admin-mem-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "ادمین عضویت", email: adminEmail, password: "Password123" });
    await prisma.user.update({ where: { email: adminEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    await prisma.userRole.create({ data: { userId: adminUser!.id, role: "ADMIN" } });
    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: "Password123" });
    adminToken = adminLogin.body.data.accessToken;

    const studentEmail = `student-mem-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد عضویت", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    const sport = await prisma.sport.create({ data: { name: `رشته تست ${Date.now()}-${Math.random()}` } });
    sportId = sport.id;
  });

  it("باید به کاربر عادی اجازه ایجاد عضویت ندهد (خطای 403)", async () => {
    const res = await request(app).post("/api/v1/memberships").set("Authorization", `Bearer ${studentToken}`).send({
      userId: studentId, sportId,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(res.status).toBe(403);
  });

  it("باید به ادمین اجازه ایجاد عضویت بدهد (خطای 201)", async () => {
    const res = await request(app).post("/api/v1/memberships").set("Authorization", `Bearer ${adminToken}`).send({
      userId: studentId, sportId,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(res.status).toBe(201);
    expect(res.body.data.membership.status).toBe("ACTIVE");
  });
});