/**
 * تست اعتبارسنجی مسیرهای احراز هویت.
 * دلیل استفاده: اطمینان از اینکه داده‌های ناقص یا نامعتبر توسط Zod رد می‌شوند و خطای دقیق برمی‌گردانند.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Auth Validation", () => {
  it("باید برای رمز عبور کوتاه خطای 400 برگرداند", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      fullName: "تست",
      email: "test@example.com",
      password: "123", // رمز عبور خیلی کوتاه
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("اطلاعات ورودی نامعتبر است.");
    // بررسی اینکه خطای مربوط به پسورد داخل آرایه errors هست
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "body.password" })
      ])
    );
  });
});