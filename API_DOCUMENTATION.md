# 📚 مستندات کامل API - بک‌اند باشگاه ورزشی

**نسخه:** 1.0.0 (تا فاز ۱۳)  
**آدرس پایه (Base URL):** `http://localhost:5000/api/v1`

---

## 🔑 نکات پایه
- **احراز هویت:** برای مسیرهایی که نیاز به لاگین دارن، هدر `Authorization: Bearer <accessToken>` رو بفرست.
- **فرمت تاریخ:** تمام تاریخ‌ها به صورت `ISO 8601` (مثل `2023-10-24T10:00:00.000Z`) برمی‌گردن.
- **ساختار استاندارد پاسخ موفق:**
```json
{
  "success": true,
  "message": "پیام موفقیت",
  "data": { ... }
}
```
- **ساختار استاندارد پاسخ خطا:**
```json
{
  "success": false,
  "message": "پیام خطا"
}
```
- **کدهای خطا:** `400` (ورودی نامعتبر)، `401` (احتیاج به احراز هویت)، `403` (دسترسی غیرمجاز)، `404` (پیدا نشد)، `409` (تکراری).

---

## 🔐 ۱. احراز هویت (Auth)
**مسیر پایه:** `/auth`

### ۱.۱. ثبت‌نام
- **متد:** `POST`
- **آدرس:** `/auth/register`
- **بدنه درخواست:**
```json
{
  "fullName": "علی رضایی",
  "email": "ali@example.com",
  "phone": "09123456789",
  "password": "Password123"
}
```
- **پاسخ موفق (201 Created):**
```json
{
  "success": true,
  "message": "ثبت‌نام با موفقیت انجام شد. لطفاً ایمیل خود را تأیید کنید.",
  "data": {
    "userId": "uuid-here"
  }
}
```

### ۱.۲. ورود
- **متد:** `POST`
- **آدرس:** `/auth/login`
- **بدنه درخواست:**
```json
{
  "email": "ali@example.com",
  "password": "Password123"
}
```
- **پاسخ موفق (200 OK):**
```json
{
  "success": true,
  "message": "ورود موفقیت‌آمیز بود.",
  "data": {
    "user": {
      "id": "uuid-here",
      "fullName": "علی رضایی",
      "email": "ali@example.com",
      "phone": "09123456789",
      "roles": ["STUDENT"]
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "a1b2c3d4..."
  }
}
```

### ۱.۳. دریافت پروفایل
- **متد:** `GET`
- **آدرس:** `/auth/me`
- **نیاز به توکن:** بله
- **پاسخ موفق:** دقیقاً مشابه فیلد `user` در پاسخ ورود.

### ۱.۴. ویرایش پروفایل
- **متد:** `PATCH`
- **آدرس:** `/auth/profile`
- **نیاز به توکن:** بله
- **بدنه درخواست:** `{"fullName": "نام جدید", "phone": "09120000000"}`

### ۱.۵. تغییر رمز عبور
- **متد:** `PATCH`
- **آدرس:** `/auth/change-password`
- **نیاز به توکن:** بله
- **بدنه درخواست:** `{"currentPassword": "...", "newPassword": "..."}`

### ۱.۶. فراموشی رمز
- **متد:** `POST`
- **آدرس:** `/auth/forgot-password`
- **بدنه درخواست:** `{"email": "ali@example.com"}`

### ۱.۷. بازیابی رمز
- **متد:** `POST`
- **آدرس:** `/auth/reset-password`
- **بدنه درخواست:** `{"token": "...", "newPassword": "..."}`

### ۱.۸. تأیید ایمیل
- **متد:** `POST`
- **آدرس:** `/auth/verify-email`
- **بدنه درخواست:** `{"token": "..."}`

### ۱.۹. تغییر ایمیل
- **متد:** `PATCH`
- **آدرس:** `/auth/change-email`
- **بدنه درخواست:** `{"newEmail": "...", "password": "..."}`

### ۱.۱۰. تازه‌سازی توکن
- **متد:** `POST`
- **آدرس:** `/auth/refresh`
- **بدنه درخواست:** `{"refreshToken": "..."}`
- **پاسخ موفق:** شامل `accessToken` و `refreshToken` جدید.

### ۱.۱۱. خروج
- **متد:** `POST`
- **آدرس:** `/auth/logout`
- **بدنه درخواست:** `{"refreshToken": "..."}`

---

## 🏋️ ۲. رشته‌های ورزشی (Sports)
**مسیر پایه:** `/sports`

### ۲.۱. لیست رشته‌ها
- **متد:** `GET`
- **آدرس:** `/sports` (با `?search=...` برای جستجو)
- **پاسخ موفق:**
```json
{
  "success": true,
  "message": "لیست رشته‌های ورزشی دریافت شد.",
  "data": {
    "sports": [
      { "id": "uuid", "name": "بدنسازی", "description": "...", "icon": "...", "isActive": true }
    ]
  }
}
```

### ۲.۲. ساخت رشته (ادمین)
- **متد:** `POST`
- **آدرس:** `/sports`
- **بدنه درخواست:** `{"name": "...", "description": "...", "icon": "..."}`

### ۲.۳. ویرایش/حذف رشته (ادمین)
- **ویرایش:** `PATCH /sports/:id`
- **حذف:** `DELETE /sports/:id`

---

## 📝 ۳. عضویت‌ها (Memberships)
**مسیر پایه:** `/memberships`

### ۳.۱. لیست عضویت‌ها
- **متد:** `GET`
- **آدرس:** `/memberships` (کاربر عادی فقط لیست خودش، ادمین می‌تونه `?userId=...` بده)
- **پاسخ موفق:**
```json
{
  "success": true,
  "message": "لیست عضویت‌ها دریافت شد.",
  "data": {
    "memberships": [
      {
        "id": "uuid",
        "status": "ACTIVE",
        "startsAt": "2023-10-24T...",
        "endsAt": "2023-11-24T...",
        "sport": { "id": "sport-uuid", "name": "بدنسازی" }
      }
    ]
  }
}
```

### ۳.۲. ایجاد عضویت (ادمین)
- **متد:** `POST`
- **آدرس:** `/memberships`
- **بدنه درخواست:** `{"userId": "...", "sportId": "...", "startsAt": "2023-10-24T...", "endsAt": "2023-11-24T..."}`

### ۳.۳. لغو عضویت (ادمین)
- **متد:** `PATCH`
- **آدرس:** `/memberships/:id/cancel`

---

## 🤝 ۴. ارتباط مربی و شاگرد (Coach-Student)
**مسیر پایه:** `/` (مستقیم زیر `/api/v1`)

### ۴.۱. لیست مربیان (شاگرد)
- **متد:** `GET`
- **آدرس:** `/coaches`

### ۴.۲. ارسال درخواست (شاگرد)
- **متد:** `POST`
- **آدرس:** `/coaches/:coachId/request`
- **بدنه درخواست:** `{"sportId": "..."}`

### ۴.۳. تأیید/رد درخواست (مربی)
- **متد:** `PATCH`
- **آدرس:** `/coach-requests/:requestId`
- **بدنه درخواست:** `{"decision": "APPROVE"}`

### ۴.۴. لغو درخواست (شاگرد)
- **متد:** `PATCH`
- **آدرس:** `/coach-requests/:requestId/cancel`

### ۴.۵. پایان ارتباط
- **متد:** `PATCH`
- **آدرس:** `/coach-students/:id/end`
- **بدنه درخواست:** `{"reason": "..."}`

---

## 🏃 ۵. برنامه‌های تمرینی (Programs)
**مسیر پایه:** `/programs`

### ۵.۱. ساخت تمرین (مربی)
- **متد:** `POST`
- **آدرس:** `/programs/exercises`
- **بدنه:** `{"name": "پرس سینه", "muscleGroup": "سینه"}`

### ۵.۲. ساخت برنامه (مربی)
- **متد:** `POST`
- **آدرس:** `/programs`
- **بدنه:** `{"name": "برنامه حجم", "description": "..."}`

### ۵.۳. مشاهده برنامه (همه)
- **متد:** `GET`
- **آدرس:** `/programs/:id`
- **پاسخ موفق:**
```json
{
  "success": true,
  "data": {
    "program": {
      "id": "uuid",
      "name": "برنامه حجم",
      "days": [
        {
          "id": "day-uuid",
          "dayOfWeek": 1,
          "name": "سینه",
          "exercises": [
            { "id": "pe-uuid", "sets": 4, "reps": 12, "weight": 60, "exercise": { "name": "پرس سینه" } }
          ]
        }
      ]
    }
  }
}
```

### ۵.۴. مدیریت روزها (مربی)
- **افزودن روز:** `POST /programs/:programId/days` (بدنه: `{"dayOfWeek": 1, "name": "..."}`)
- **ویرایش روز:** `PATCH /programs/days/:id`
- **حذف روز:** `DELETE /programs/days/:id`

### ۵.۵. مدیریت تمرین‌های برنامه (مربی)
- **افزودن:** `POST /programs/days/:dayId/exercises` (بدنه: `{"exerciseId": "...", "sets": 4, "reps": 12, "weight": 60}`)
- **ویرایش:** `PATCH /programs/exercises/:id`
- **حذف:** `DELETE /programs/exercises/:id`

### ۵.۶. اختصاص به شاگرد (مربی)
- **تکی:** `POST /programs/:programId/assign` (بدنه: `{"studentId": "..."}`)
- **دسته‌ای:** `POST /programs/:programId/assign-bulk` (بدنه: `{"studentIds": ["...", "..."]}`)

### ۵.۷. ثبت اجرای تمرین (شاگرد)
- **متد:** `POST`
- **آدرس:** `/programs/log`
- **بدنه:** `{"programExerciseId": "...", "actualSets": 4, "actualReps": 10, "actualWeight": 60}`

### ۵.۸. نسخه‌بندی (مربی)
- **لیست نسخه‌ها:** `GET /programs/:programId/versions`
- **بازگردانی:** `POST /programs/:programId/versions/:versionId/revert`

---

## 👥 ۶. گروه‌ها (Groups)
**مسیر پایه:** `/groups`

### ۶.۱. ساخت گروه (مربی)
- **متد:** `POST`
- **آدرس:** `/groups`
- **بدنه:** `{"name": "گروه صبح", "capacity": 10}`

### ۶.۲. لیست گروه‌ها (مربی)
- **متد:** `GET`
- **آدرس:** `/groups`

### ۶.۳. مدیریت اعضا
- **افزودن:** `POST /groups/:id/members` (بدنه: `{"userId": "..."}`)
- **حذف:** `DELETE /groups/:id/members/:userId`

### ۶.۴. اختصاص برنامه (مربی)
- **متد:** `POST`
- **آدرس:** `/groups/:id/assign-program`
- **بدنه:** `{"programId": "..."}`

### ۶.۵. تغییرات اختصاصی (مربی)
- **ثبت:** `POST /groups/:id/members/:userId/override` (بدنه: `{"overrides": {"sets": 5}}`)
- **مشاهده:** `GET /groups/:id/members/:userId/override`

---

## 📁 ۷. فایل‌ها (Files)
**مسیر پایه:** `/files`

### ۷.۱. آپلود
- **متد:** `POST`
- **آدرس:** `/files`
- **نوع:** `multipart/form-data` با فیلد `file`
- **پاسخ موفق:**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "uuid",
      "originalName": "photo.jpg",
      "path": "/uploads/...",
      "mimeType": "image/jpeg"
    }
  }
}
```

### ۷.۲. سایر عملیات
- **لیست فایل‌ها:** `GET /files`
- **دانلود:** `GET /files/:id/download`
- **حذف:** `DELETE /files/:id`

---

## 💬 ۸. چت (Chat)
**مسیر پایه:** `/chats`

### ۸.۱. ساخت مکالمه خصوصی
- **متد:** `POST`
- **آدرس:** `/chats/private`
- **بدنه:** `{"recipientId": "..."}`

### ۸.۲. ساخت گروه
- **متد:** `POST`
- **آدرس:** `/chats/group`
- **بدنه:** `{"title": "گروه", "memberIds": ["..."]}`

### ۸.۳. لیست مکالمات
- **متد:** `GET`
- **آدرس:** `/chats`
- **پاسخ موفق:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "type": "PRIVATE",
        "unreadCount": 3,
        "members": [{"user": {"fullName": "..."}}],
        "messages": [{"content": "آخرین پیام"}]
      }
    ]
  }
}
```

### ۸.۴. تاریخچه پیام‌ها
- **متد:** `GET`
- **آدرس:** `/chats/:id/messages?cursor=...&limit=50`

### ۸.۵. Socket.IO (Real-time)
- **آدرس اتصال:** `http://localhost:5000`
- **احراز هویت:** `socket.handshake.auth.token = "<accessToken>"`
- **اتصال به مکالمه:** `socket.emit("conversation:join", "conversationId")`
- **ارسال پیام:** `socket.emit("message:send", { conversationId, content })`
- **دریافت پیام:** `socket.on("message:new", (message) => { ... })`
- **وضعیت تایپ:** `socket.emit("typing:start", { conversationId })` و `socket.emit("typing:stop", { conversationId })`
- **دریافت تایپ:** `socket.on("typing", (data) => { ... })`

---

## 🔔 ۹. اعلان‌ها (Notifications)
**مسیر پایه:** `/notifications`

### ۹.۱. لیست اعلان‌ها
- **متد:** `GET`
- **آدرس:** `/notifications?unreadOnly=true`
- **پاسخ موفق:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "NEW_MESSAGE",
        "title": "پیام جدید",
        "body": "...",
        "isRead": false,
        "createdAt": "2023-10-24T...",
        "data": { "conversationId": "..." }
      }
    ]
  }
}
```

### ۹.۲. تعداد خوانده‌نشده
- **متد:** `GET`
- **آدرس:** `/notifications/unread-count`
- **پاسخ:** `{"success": true, "data": {"count": 5}}`

### ۹.۳. علامت‌گذاری
- **همه:** `PATCH /notifications/read-all`
- **یکی:** `PATCH /notifications/:id/read`

---

## 🎯 راهنمای سریع برای فرانت‌کارت
۱. **مرحله ۱:** ابتدا `POST /auth/register` و سپس `POST /auth/verify-email` (با توکنی که در کنسول سرور چاپ می‌شه) و بعد `POST /auth/login`.
۲. **مرحله ۲:** توکن دریافتی رو توی هدر `Authorization` برای همه درخواست‌های بعدی قرار بده.
۳. **مرحله ۳:** برای چت، ابتدا `POST /chats/private` یا `POST /chats/group` بزن، سپس به Socket.IO وصل شو و `conversation:join` رو صدا بزن.
۴. **خطاها:** همیشه `success: false` رو چک کن و پیام خطا رو نمایش بده.
