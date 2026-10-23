/**
 * تست‌های مربوط به مدیریت چت.
 * دلیل استفاده: بررسی ایجاد مکالمه، ارسال پیام و کنترل دسترسی.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Chat Management", () => {
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let conversationId: string;

  beforeAll(async () => {
    // ۱. ساخت کاربر اول
    const email1 = `user1-chat-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر اول", email: email1, password: "Password123" });
    await prisma.user.update({ where: { email: email1 }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const user1 = await prisma.user.findUnique({ where: { email: email1 } });
    user1Id = user1!.id;
    const login1 = await request(app).post("/api/v1/auth/login").send({ email: email1, password: "Password123" });
    user1Token = login1.body.data.accessToken;

    // ۲. ساخت کاربر دوم
    const email2 = `user2-chat-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر دوم", email: email2, password: "Password123" });
    await prisma.user.update({ where: { email: email2 }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const user2 = await prisma.user.findUnique({ where: { email: email2 } });
    user2Id = user2!.id;
    const login2 = await request(app).post("/api/v1/auth/login").send({ email: email2, password: "Password123" });
    user2Token = login2.body.data.accessToken;
  });

  it("باید یک مکالمه خصوصی بین دو کاربر ایجاد کند", async () => {
    const res = await request(app)
      .post("/api/v1/chats/private")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ recipientId: user2Id });

    expect(res.status).toBe(201);
    conversationId = res.body.data.conversation.id;
  });

  it("باید لیست مکالمات کاربر را برگرداند", async () => {
    const res = await request(app)
      .get("/api/v1/chats")
      .set("Authorization", `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.conversations.length).toBeGreaterThan(0);
  });

  it("باید پیام‌های مکالمه را برای اعضا برگرداند", async () => {
    const res = await request(app)
      .get(`/api/v1/chats/${conversationId}/messages`)
      .set("Authorization", `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.messages)).toBe(true);
  });

  it("باید از دسترسی غیرمجاز به پیام‌های مکالمه جلوگیری کند", async () => {
    // ساخت یک کاربر سوم که عضو مکالمه نیست
    const email3 = `user3-chat-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({ fullName: "کاربر سوم", email: email3, password: "Password123" });
    await prisma.user.update({ where: { email: email3 }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } });
    const login3 = await request(app).post("/api/v1/auth/login").send({ email: email3, password: "Password123" });
    const user3Token = login3.body.data.accessToken;

    const res = await request(app)
      .get(`/api/v1/chats/${conversationId}/messages`)
      .set("Authorization", `Bearer ${user3Token}`);

    expect(res.status).toBe(403);
  });
});