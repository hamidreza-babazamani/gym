/**
 * تست‌های پنل مدیریتی (فاز ۱۷).
 * دلیل استفاده: بررسی دسترسی‌ها، مدیریت کاربران و گزارش‌ها.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Admin Panel", () => {
  let superAdminToken: string;
  let adminToken: string;
  let studentToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    // ۱. ساخت Super Admin
    const saEmail = `sa-admin-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "سوپر ادمین", email: saEmail, password: "Password123" });
    await prisma.user.update({ where: { email: saEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const saUser = await prisma.user.findUnique({ where: { email: saEmail } });
    await prisma.userRole.create({ data: { userId: saUser!.id, role: "SUPER_ADMIN" } });
    const saLogin = await request(app).post("/api/v1/auth/login").send({ email: saEmail, password: "Password123" });
    superAdminToken = saLogin.body.data.accessToken;

    // ۲. ساخت ادمین عادی
    const adminEmail = `admin-admin-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "ادمین", email: adminEmail, password: "Password123" });
    await prisma.user.update({ where: { email: adminEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    await prisma.userRole.create({ data: { userId: adminUser!.id, role: "ADMIN" } });
    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: "Password123" });
    adminToken = adminLogin.body.data.accessToken;

    // ۳. ساخت کاربر عادی
    const studentEmail = `student-admin-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر عادی", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    targetUserId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;
  });

  it("باید از دسترسی کاربر عادی به پنل ادمین جلوگیری کند", async () => {
    const res = await request(app).get("/api/v1/admin/users").set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it("باید لیست کاربران را برای ادمین برگرداند", async () => {
    const res = await request(app).get("/api/v1/admin/users").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
  });

  it("باید به ادمین اجازه تغییر وضعیت کاربر را بدهد", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${targetUserId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "SUSPENDED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SUSPENDED");
  });

  it("باید به ادمین اجازه مشاهده گزارش آماری را بدهد", async () => {
    const res = await request(app).get("/api/v1/admin/reports/stats").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("totalUsers");
  });

  it("باید به ادمین اجازه مشاهده گزارش مالی را بدهد", async () => {
    const res = await request(app).get("/api/v1/admin/reports/financial").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("totalRevenue");
  });

  it("باید فقط Super Admin به Audit Log دسترسی داشته باشد", async () => {
    // ادمین عادی نباید دسترسی داشته باشد
    const res1 = await request(app).get("/api/v1/admin/audit-logs").set("Authorization", `Bearer ${adminToken}`);
    expect(res1.status).toBe(403);

    // Super Admin باید دسترسی داشته باشد
    const res2 = await request(app).get("/api/v1/admin/audit-logs").set("Authorization", `Bearer ${superAdminToken}`);
    expect(res2.status).toBe(200);
  });
});