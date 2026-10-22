/**
 * تنظیمات Swagger برای مستندسازی API.
 * دلیل استفاده: ایجاد یک رابط کاربری تعاملی برای مشاهده و تست Endpointها.
 */
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Gym Backend API",
      version: "1.0.0",
      description: "مستندات APIهای پروژه بک‌اند باشگاه ورزشی",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // مسیرهایی که باید برای پیدا کردن کامنت‌های Swagger جستجو شوند
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);