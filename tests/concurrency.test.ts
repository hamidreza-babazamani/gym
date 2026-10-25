/**
 * تست‌های هم‌زمانی و Race Condition.
 * دلیل استفاده: اطمینان از اینکه درخواست‌های هم‌زمان باعث خرابی داده نمی‌شن.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Concurrency & Race Conditions", () => {
  let adminToken: string;
  let studentToken: string;
  let planId: string;

  beforeAll(async () => {
    // ساخت ادمین
    const adminEmail = `admin-conc-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "ادمین هم‌زمانی", email: adminEmail, password: "Password123" });
    await prisma.user.update({ where: { email: adminEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    await prisma.userRole.create({ data: { userId: adminUser!.id, role: "ADMIN" } });
    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: "Password123" });
    adminToken = adminLogin.body.data.accessToken;

    // ساخت شاگرد
    const studentEmail = `student-conc-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "شاگرد هم‌زمانی", email: studentEmail, password: "Password123" });
    await prisma.user.update({ where: { email: studentEmail }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const studentLogin = await request(app).post("/api/v1/auth/login").send({ email: studentEmail, password: "Password123" });
    studentToken = studentLogin.body.data.accessToken;

    // ساخت پلن
    const planRes = await request(app).post("/api/v1/payments/plans").set("Authorization", `Bearer ${adminToken}`).send({ name: "پلن تست هم‌زمانی", price: 50000, durationDays: 30 });
    planId = planRes.body.data.plan.id;
  });

  it("باید از ایجاد دو سفارش هم‌زمان با یک idempotencyKey جلوگیری کند", async () => {
    const idempotencyKey = `test-key-${Date.now()}`;
    const results = await Promise.all([
      request(app).post("/api/v1/payments/orders").set("Authorization", `Bearer ${studentToken}`).send({ planId, idempotencyKey }),
      request(app).post("/api/v1/payments/orders").set("Authorization", `Bearer ${studentToken}`).send({ planId, idempotencyKey }),
      request(app).post("/api/v1/payments/orders").set("Authorization", `Bearer ${studentToken}`).send({ planId, idempotencyKey }),
    ]);

    // فقط یک سفارش باید ساخته بشه
    const orders = await prisma.order.findMany({ where: { idempotencyKey } });
    expect(orders.length).toBe(1);
  });

  it("باید از دو بار تأیید یک تراکنش جلوگیری کند", async () => {
    // ایجاد سفارش و شروع پرداخت
    const orderRes = await request(app).post("/api/v1/payments/orders").set("Authorization", `Bearer ${studentToken}`).send({ planId });
    const orderId = orderRes.body.data.order.id;
    const payRes = await request(app).post(`/api/v1/payments/orders/${orderId}/pay`).set("Authorization", `Bearer ${studentToken}`);
    const authority = payRes.body.data.authority;

    // تلاش برای دو بار تأیید هم‌زمان
    const results = await Promise.all([
      request(app).post("/api/v1/payments/verify").set("Authorization", `Bearer ${studentToken}`).send({ authority, status: "OK" }),
      request(app).post("/api/v1/payments/verify").set("Authorization", `Bearer ${studentToken}`).send({ authority, status: "OK" }),
    ]);

    // فقط یکی باید موفق بشه (۲۰۰) و دیگری باید رد بشه (۴۰۰)
    const successCount = results.filter(r => r.status === 200).length;
    expect(successCount).toBe(1);

    // فقط یک عضویت فعال باید ایجاد شده باشه
    const memberships = await prisma.membership.findMany({
      where: { userId: (await prisma.order.findUnique({ where: { id: orderId } }))!.userId, status: "ACTIVE" },
    });
    expect(memberships.length).toBe(1);
  });
});