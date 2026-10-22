/**
 * تست مربوط به مدیریت مسیرهای نامعتبر (404).
 * دلیل استفاده: اطمینان از اینکه مسیرهای اشتباه به درستی توسط میدل‌ور مدیریت می‌شوند.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Not Found Middleware", () => {
  it("باید برای مسیرهای نامعتبر خطای 404 برگرداند", async () => {
    const response = await request(app).get("/api/v1/this-route-does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("مسیر موردنظر پیدا نشد.");
  });
});