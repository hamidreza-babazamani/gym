/**
 * تست‌های سیستم اعلان‌ها.
 * دلیل استفاده: بررسی ایجاد، دریافت و علامت‌گذاری اعلان‌ها.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Notification System", () => {
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const email = `user-notif-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "کاربر اعلان", email, password: "Password123",
    });
    await prisma.user.update({ where: { email }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const user = await prisma.user.findUnique({ where: { email } });
    userId = user!.id;
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password: "Password123" });
    userToken = loginRes.body.data.accessToken;
  });

  it("باید لیست اعلان‌ها را برگرداند", async () => {
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
  });

  it("باید تعداد اعلان‌های خوانده‌نشده را برگرداند", async () => {
    const res = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.count).toBe("number");
  });

  it("باید اعلان جدید را با استفاده از صف ایجاد کند", async () => {
    // ایجاد مستقیم اعلان از طریق کد (شبیه‌سازی)
    const { createNotification } = await import("../src/controllers/notification.controller");
    await createNotification(userId, "SYSTEM", "تست اعلان", "این یک اعلان تستی است.");

    // صبر برای پردازش صف (۲ ثانیه)
    await new Promise(resolve => setTimeout(resolve, 2500));

    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications.length).toBeGreaterThan(0);
    expect(res.body.data.notifications[0].title).toBe("تست اعلان");
  });

  it("باید همه اعلان‌ها را خوانده‌شده کند", async () => {
    const res = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);

    const countRes = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${userToken}`);
    expect(countRes.body.data.count).toBe(0);
  });
});