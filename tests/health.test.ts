/**
 * تست مربوط به بررسی وضعیت سرور (Health Check).
 * دلیل استفاده: اطمینان از اینکه سرور و دیتابیس به درستی به درخواست‌ها پاسخ می‌دهند.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Health Check API", () => {
  it("باید وضعیت 200 و پیام موفقیت برگرداند", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Gym Backend is running!");
    expect(response.body.services.database).toBe("connected");
  });
});