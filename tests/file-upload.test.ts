/**
 * تست‌های آپلود فایل.
 * دلیل استفاده: بررسی عملکرد صحیح آپلود، دانلود و حذف فایل.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";
import fs from "fs";
import path from "path";

describe("File Upload", () => {
  let token: string;
  let uploadedFileId: string;
  const testFilePath = path.join(__dirname, "test-upload.pdf");
  beforeAll(async () => {
    // ساخت کاربر تستی
    const email = `user-file-${Date.now()}@example.com`;
    await request(app).post("/api/v1/auth/register").send({
      fullName: "کاربر فایل",
      email,
      password: "Password123",
    });
    await prisma.user.update({
      where: { email },
      data: { status: "ACTIVE", emailVerifiedAt: new Date() },
    });
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password: "Password123" });
    token = loginRes.body.data.accessToken;

    // ساخت یک فایل تستی روی دیسک
    fs.writeFileSync(testFilePath, "%PDF-1.4\n%Test PDF content");  });

  it("باید فایل را با موفقیت آپلود کند", async () => {
    const res = await request(app)
      .post("/api/v1/files")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", testFilePath);

    expect(res.status).toBe(201);
    expect(res.body.data.file).toHaveProperty("id");
    expect(res.body.data.file.originalName).toBe("test-upload.pdf");
    uploadedFileId = res.body.data.file.id;
  });

  it("باید لیست فایل‌ها را برگرداند", async () => {
    const res = await request(app)
      .get("/api/v1/files")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.files)).toBe(true);
    expect(res.body.data.files.length).toBeGreaterThan(0);
  });

  it("باید فایل را با موفقیت دانلود کند", async () => {
    const res = await request(app)
      .get(`/api/v1/files/${uploadedFileId}/download`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("باید فایل را با موفقیت حذف کند", async () => {
    const res = await request(app)
      .delete(`/api/v1/files/${uploadedFileId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    // بررسی اینکه فایل از دیتابیس حذف شده
    const file = await prisma.file.findUnique({ where: { id: uploadedFileId } });
    expect(file).toBeNull();
  });
});