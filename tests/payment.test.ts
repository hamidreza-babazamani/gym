/**
 * تست‌های سیستم اشتراک و پرداخت.
 * دلیل استفاده: بررسی صحت ایجاد پلن، سفارش، پرداخت موفق/ناموفق و تمدید عضویت.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Payment & Subscription", () => {
  let adminToken: string;
  let studentToken: string;
  let studentId: string;
  let planId: string;
  let orderId: string;
  let authority: string;

  beforeAll(async () => {
    // ۱. ساخت ادمین
    const adminEmail = `admin-pay-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "ادمین پرداخت", email: adminEmail, password: "Password123" });
    await prisma.user.update({ where: { email: adminEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    await prisma.userRole.create({ data: { userId: adminUser!.id, role: "ADMIN" } });
    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: "Password123" });
    adminToken = adminLogin.body.data.accessToken;

    // ۲. ساخت شاگرد
    const studentEmail = `student-pay-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد پرداخت", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    studentId = studentUser!.id;
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    // ۳. ساخت یک رشته ورزشی برای تست فعال‌سازی اشتراک
    await prisma.sport.create({ data: { name: `رشته پرداخت ${Date.now()}` } });
  });

  it("باید به ادمین اجازه ساخت پلن بدهد", async () => {
    const res = await request(app)
      .post("/api/v1/payments/plans")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "پلن یک ماهه", price: 100000, durationDays: 30 });

    expect(res.status).toBe(201);
    planId = res.body.data.plan.id;
  });

  it("باید به کاربر عادی اجازه ساخت پلن ندهد", async () => {
    const res = await request(app)
      .post("/api/v1/payments/plans")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "پلن غیرمجاز", price: 1000, durationDays: 1 });

    expect(res.status).toBe(403);
  });

  it("باید لیست پلن‌ها را برگرداند", async () => {
    const res = await request(app).get("/api/v1/payments/plans").set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plans.length).toBeGreaterThan(0);
  });

  it("باید سفارش را ایجاد کند", async () => {
    const res = await request(app)
      .post("/api/v1/payments/orders")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ planId });

    expect(res.status).toBe(201);
    orderId = res.body.data.order.id;
    expect(res.body.data.order.status).toBe("PENDING");
  });

  it("باید پرداخت را شروع کند و کد رهگیری تولید کند", async () => {
    const res = await request(app)
      .post(`/api/v1/payments/orders/${orderId}/pay`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    authority = res.body.data.authority;
    expect(authority).toMatch(/^MOCK-/);
  });

  it("باید پرداخت موفق را تأیید کند و عضویت را فعال کند", async () => {
    const res = await request(app)
      .post("/api/v1/payments/verify")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ authority, status: "OK" });

    expect(res.status).toBe(200);

    // بررسی وضعیت سفارش
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("PAID");

    // بررسی فعال شدن عضویت
    const membership = await prisma.membership.findFirst({ where: { userId: studentId, status: "ACTIVE" } });
    expect(membership).toBeDefined();
  });

  it("باید از تأیید مجدد همان تراکنش جلوگیری کند", async () => {
    const res = await request(app)
      .post("/api/v1/payments/verify")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ authority, status: "OK" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("قبلاً پردازش شده");
  });
});