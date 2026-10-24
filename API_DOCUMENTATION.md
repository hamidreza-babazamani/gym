# 📚 مستندات API (خلاصه و کاربردی)

**Base URL:** `http://localhost:5000/api/v1`
**احراز هویت:** هدر `Authorization: Bearer <token>`

---

## 🔐 Auth (احراز هویت)

`POST /auth/register` - ثبت‌نام
- **Body:** `{ "fullName", "email", "phone", "password" }`
- **Res:** `{ "success": true, "message": "...", "data": { "userId": "uuid" } }`

`POST /auth/login` - ورود
- **Body:** `{ "email", "password" }`
- **Res:** `{ "success": true, "data": { "user": {...}, "accessToken": "...", "refreshToken": "..." } }`

`GET /auth/me` - دریافت پروفایل (نیاز به توکن)
- **Res:** `{ "success": true, "data": { "user": { "id", "fullName", "email", "phone", "roles" } } }`

`PATCH /auth/profile` - ویرایش پروفایل
- **Body:** `{ "fullName", "phone" }`

`PATCH /auth/change-password` - تغییر رمز
- **Body:** `{ "currentPassword", "newPassword" }`

`POST /auth/forgot-password` - فراموشی رمز
- **Body:** `{ "email" }`

`POST /auth/reset-password` - بازیابی رمز
- **Body:** `{ "token", "newPassword" }`

`POST /auth/verify-email` - تأیید ایمیل
- **Body:** `{ "token" }`

`POST /auth/resend-verification` - ارسال مجدد لینک تأیید
- **Body:** `{ "email" }`

`PATCH /auth/change-email` - تغییر ایمیل
- **Body:** `{ "newEmail", "password" }`

`POST /auth/refresh` - تازه‌سازی توکن
- **Body:** `{ "refreshToken" }`
- **Res:** `{ "data": { "accessToken", "refreshToken" } }`

`POST /auth/logout` - خروج
- **Body:** `{ "refreshToken" }`

---

## 🏋️ Sports (رشته‌های ورزشی)

`GET /sports` - لیست رشته‌ها
- **Res:** `{ "data": { "sports": [ { "id", "name", "description", "icon", "isActive" } ] } }`

`GET /sports/:id` - جزئیات رشته
- **Res:** `{ "data": { "sport": { ... } } }`

`POST /sports` - ساخت رشته (ادمین)
- **Body:** `{ "name", "description", "icon" }`

`PATCH /sports/:id` - ویرایش رشته (ادمین)
`DELETE /sports/:id` - حذف رشته (ادمین)

---

## 📝 Memberships (عضویت‌ها)

`GET /memberships` - لیست عضویت‌ها
- **Res:** `{ "data": { "memberships": [ { "id", "status", "startsAt", "endsAt", "sport": { "name" } } ] } }`

`POST /memberships` - ایجاد (ادمین)
- **Body:** `{ "userId", "sportId", "startsAt", "endsAt" }`

`PATCH /memberships/:id` - ویرایش (ادمین)
`PATCH /memberships/:id/cancel` - لغو (ادمین)

---

## 🤝 Coach-Student (ارتباط مربی و شاگرد)

`GET /coaches` - لیست مربیان (شاگرد)
- **Res:** `{ "data": { "coaches": [ { "id", "fullName" } ], "count": 5 } }`

`POST /coaches/:coachId/request` - ارسال درخواست
- **Body:** `{ "sportId" }`

`PATCH /coach-requests/:requestId` - تأیید/رد (مربی)
- **Body:** `{ "decision": "APPROVE" | "REJECT" }`

`PATCH /coach-requests/:requestId/cancel` - لغو (شاگرد)
`PATCH /coach-students/:id/end` - پایان ارتباط
- **Body:** `{ "reason" }`

---

## 🏃 Programs (برنامه‌های تمرینی)

`POST /programs/exercises` - ساخت تمرین
- **Body:** `{ "name", "muscleGroup" }`

`POST /programs` - ساخت برنامه
- **Body:** `{ "name", "description" }`

`GET /programs/:id` - مشاهده برنامه
- **Res:** `{ "data": { "program": { "id", "name", "days": [ { "name", "exercises": [...] } ] } } }`

`PATCH /programs/:id` - ویرایش برنامه
`DELETE /programs/:id` - حذف برنامه

`POST /programs/:programId/days` - افزودن روز
- **Body:** `{ "dayOfWeek", "name" }`

`PATCH /programs/days/:id` - ویرایش روز
`DELETE /programs/days/:id` - حذف روز

`POST /programs/days/:dayId/exercises` - افزودن تمرین به روز
- **Body:** `{ "exerciseId", "sets", "reps", "weight" }`

`PATCH /programs/exercises/:id` - ویرایش تمرین
`DELETE /programs/exercises/:id` - حذف تمرین

`POST /programs/:programId/assign` - اختصاص به شاگرد
- **Body:** `{ "studentId" }`

`POST /programs/:programId/assign-bulk` - اختصاص دسته‌ای
- **Body:** `{ "studentIds": [] }`

`POST /programs/log` - ثبت اجرای تمرین (شاگرد)
- **Body:** `{ "programExerciseId", "actualSets", "actualReps", "actualWeight" }`

`GET /programs/:programId/versions` - لیست نسخه‌ها
`POST /programs/:programId/versions/:versionId/revert` - بازگردانی نسخه

---

## 👥 Groups (گروه‌ها)

`POST /groups` - ساخت گروه
- **Body:** `{ "name", "capacity" }`

`GET /groups` - لیست گروه‌ها
- **Res:** `{ "data": { "groups": [ { "id", "name", "capacity", "_count": { "members": 5 } } ] } }`

`GET /groups/:id` - جزئیات گروه
`PATCH /groups/:id` - ویرایش گروه
`DELETE /groups/:id` - غیرفعال کردن

`POST /groups/:id/members` - افزودن عضو
- **Body:** `{ "userId" }`

`DELETE /groups/:id/members/:userId` - حذف عضو

`POST /groups/:id/assign-program` - اختصاص برنامه
- **Body:** `{ "programId" }`

`POST /groups/:id/members/:userId/override` - تغییرات اختصاصی
- **Body:** `{ "overrides": { "sets": 5 } }`

---

## 📁 Files (فایل‌ها)

`POST /files` - آپلود (multipart/form-data با فیلد `file`)
- **Res:** `{ "data": { "file": { "id", "originalName", "path", "mimeType" } } }`

`GET /files` - لیست فایل‌ها
`GET /files/:id/download` - دانلود
`DELETE /files/:id` - حذف

---

## 💬 Chat (چت)

`POST /chats/private` - مکالمه خصوصی
- **Body:** `{ "recipientId" }`

`POST /chats/group` - گروه چت
- **Body:** `{ "title", "memberIds": [] }`

`GET /chats` - لیست مکالمات
- **Res:** `{ "data": { "conversations": [ { "id", "type", "unreadCount", "members": [...], "messages": [...] } ] } }`

`GET /chats/:id/messages` - تاریخچه پیام‌ها (با `?cursor` و `?limit`)

**Socket.IO:** اتصال به `http://localhost:5000` با توکن در `auth.token`.
- `conversation:join` / `message:send` / `message:new` / `typing`

---

## 🔔 Notifications (اعلان‌ها)

`GET /notifications` - لیست اعلان‌ها
- **Res:** `{ "data": { "notifications": [ { "id", "title", "body", "isRead" } ] } }`

`GET /notifications/unread-count` - تعداد خوانده‌نشده
- **Res:** `{ "data": { "count": 5 } }`

`PATCH /notifications/read-all` - علامت‌گذاری همه
`PATCH /notifications/:id/read` - علامت‌گذاری یکی

---

## ⚠️ ساختار خطا
```json
{ "success": false, "message": "پیام خطا" }
```
