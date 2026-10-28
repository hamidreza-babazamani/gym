Gym Backend 

A production-oriented REST API for a gym management platform, built with TypeScript, Express 5, Prisma, and PostgreSQL. It supports role-based access for students, coaches, admins, and super admins, along with real-time communication and subscription management.

Features:
Authentication & Authorization: JWT authentication and role-based access control
Coach–Student Workflow: Request, approval, and cancellation
Workout Programs: Program creation, editing, rollback, and training logs
Payment & Subscription: Mock payment processing and subscription management
Real-time Chat: Instant messaging using Socket.IO
File Uploads: File upload handling with Multer
Progress Tracking: Tracking workout progress and user performance
Notifications: User notification management
Input Validation: Request validation using Zod
Security: Rate limiting, input sanitization, and authentication middleware
Testing: Automated tests using Vitest

Technology Stack:
TypeScript
Node.js
Express 5
Prisma 7
PostgreSQL
Socket.IO
JWT
Zod
Multer
Vitest

Prerequisites:
Node.js 20 or later
PostgreSQL 14 or later
npm

Installation:
git clone
cd gym
npm install

.env:
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/gym
JWT_SECRET=your_secret_key
MOCK_PAYMENT_ENABLED=true

Database Setup:
npx prisma generate
npx prisma migrate dev

Run the Application:
npm run dev


بک‌اند باشگاه ورزشی

یک REST API برای پلتفرم مدیریت باشگاه ورزشی، ساخته‌شده با TypeScript، Express 5، Prisma و PostgreSQL. این پروژه از دسترسی مبتنی بر نقش برای شاگردان، مربیان، مدیران و مدیران ارشد، همچنین ارتباط بلادرنگ و مدیریت اشتراک‌ها پشتیبانی می‌کند.

امکانات:
احراز هویت با JWT و کنترل دسترسی مبتنی بر نقش
مدیریت ارتباط مربی و شاگرد شامل درخواست، تأیید و لغو
مدیریت برنامه‌های تمرینی شامل ایجاد، ویرایش، بازگردانی نسخه قبلی و ثبت سوابق تمرین
مدیریت پرداخت آزمایشی و اشتراک‌ها
گفت‌وگوی بلادرنگ با استفاده از Socket.IO
آپلود فایل با استفاده از Multer
پیگیری پیشرفت و عملکرد کاربران
مدیریت اعلان‌های کاربران
اعتبارسنجی ورودی‌ها با Zod
اقدامات امنیتی شامل محدودسازی نرخ درخواست، پاک‌سازی ورودی‌ها و میان‌افزار احراز هویت
تست خودکار با Vitest
