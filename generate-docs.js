const fs = require("fs");

const content = `# 📚 مستندات کامل API (خلاصه و کاربردی)

**Base URL:** \`http://localhost:5000/api/v1\`
**احراز هویت:** هدر \`Authorization: Bearer <token>\`

---

## 🔐 Auth (احراز هویت)

### \`POST /auth/register\`
- **Body:** \`{ "fullName": "...", "email": "...", "phone": "...", "password": "..." }\`
- **Res:** \`{ "success": true, "message": "...", "data": { "userId": "uuid" } }\`

### \`POST /auth/login\`
- **Body:** \`{ "email": "...", "password": "..." }\`
- **Res:** \`{ "success": true, "data": { "user": { "id", "fullName", "email", "phone", "roles" }, "accessToken": "...", "refreshToken": "..." } }\`

### \`GET /auth/me\`
- **Res:** \`{ "data": { "user": { "id", "fullName", "email", "phone", "roles" } } }\`

### \`PATCH /auth/profile\`
- **Body:** \`{ "fullName": "...", "phone": "..." }\`
- **Res:** \`{ "message": "...", "data": { "user": { "id", "fullName", "email", "phone" } } }\`

### \`PATCH /auth/change-password\`
- **Body:** \`{ "currentPassword": "...", "newPassword": "..." }\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /auth/forgot-password\`
- **Body:** \`{ "email": "..." }\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /auth/reset-password\`
- **Body:** \`{ "token": "...", "newPassword": "..." }\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /auth/verify-email\`
- **Body:** \`{ "token": "..." }\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`PATCH /auth/change-email\`
- **Body:** \`{ "newEmail": "...", "password": "..." }\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /auth/refresh\`
- **Body:** \`{ "refreshToken": "..." }\`
- **Res:** \`{ "data": { "accessToken": "...", "refreshToken": "..." } }\`

### \`POST /auth/logout\`
- **Body:** \`{ "refreshToken": "..." }\`
- **Res:** \`{ "success": true, "message": "..." }\`

---

## 🏋️ Sports (رشته‌های ورزشی)

### \`GET /sports\`
- **Res:** \`{ "data": { "sports": [ { "id", "name", "description", "icon", "isActive" } ] } }\`

### \`GET /sports/:id\`
- **Res:** \`{ "data": { "sport": { ... } } }\`

### \`POST /sports\` (ادمین)
- **Body:** \`{ "name": "...", "description": "...", "icon": "..." }\`
- **Res:** \`{ "data": { "sport": { ... } } }\`

### \`PATCH /sports/:id\` (ادمین)
- **Res:** \`{ "data": { "sport": { ... } } }\`

### \`DELETE /sports/:id\` (ادمین)
- **Res:** \`{ "success": true, "message": "..." }\`

---

## 📝 Memberships (عضویت‌ها)

### \`GET /memberships\`
- **Res:** \`{ "data": { "memberships": [ { "id", "status", "startsAt", "endsAt", "sport": { "name" } } ] } }\`

### \`GET /memberships/:id\`
- **Res:** \`{ "data": { "membership": { ... } } }\`

### \`POST /memberships\` (ادمین)
- **Body:** \`{ "userId", "sportId", "startsAt", "endsAt" }\`
- **Res:** \`{ "data": { "membership": { ... } } }\`

### \`PATCH /memberships/:id\` (ادمین)
- **Res:** \`{ "data": { "membership": { ... } } }\`

### \`PATCH /memberships/:id/cancel\` (ادمین)
- **Res:** \`{ "success": true, "message": "..." }\`

---

## 🤝 Coach-Student (ارتباط مربی و شاگرد)

### \`GET /coaches\` (شاگرد)
- **Res:** \`{ "data": { "coaches": [ { "id", "fullName" } ], "count": 5 } }\`

### \`POST /coaches/:coachId/request\` (شاگرد)
- **Body:** \`{ "sportId": "..." }\`
- **Res:** \`{ "data": { "requestId": "uuid", "status": "PENDING" } }\`

### \`PATCH /coach-requests/:requestId\` (مربی)
- **Body:** \`{ "decision": "APPROVE" | "REJECT" }\`
- **Res:** \`{ "data": { "requestId": "uuid", "status": "ACTIVE" | "REJECTED" } }\`

### \`PATCH /coach-requests/:requestId/cancel\` (شاگرد)
- **Res:** \`{ "success": true, "message": "..." }\`

### \`PATCH /coach-students/:id/end\`
- **Body:** \`{ "reason": "..." }\`
- **Res:** \`{ "success": true, "message": "..." }\`

---

## 🏃 Programs (برنامه‌های تمرینی)

### \`POST /programs/exercises\`
- **Body:** \`{ "name": "...", "muscleGroup": "..." }\`
- **Res:** \`{ "data": { "exercise": { "id", "name", "muscleGroup" } } }\`

### \`POST /programs\`
- **Body:** \`{ "name": "...", "description": "..." }\`
- **Res:** \`{ "data": { "program": { "id", "name", "description", "coachId" } } }\`

### \`GET /programs/:id\`
- **Res:** \`{ "data": { "program": { "id", "name", "days": [ { "id", "name", "dayOfWeek", "exercises": [ { "id", "sets", "reps", "weight", "exercise": { "name" } } ] } ] } } }\`

### \`PATCH /programs/:id\`
- **Res:** \`{ "data": { "program": { ... } } }\`

### \`DELETE /programs/:id\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /programs/:programId/days\`
- **Body:** \`{ "dayOfWeek": 1, "name": "..." }\`
- **Res:** \`{ "data": { "day": { "id", "dayOfWeek", "name" } } }\`

### \`PATCH /programs/days/:id\`
- **Res:** \`{ "data": { "day": { ... } } }\`

### \`DELETE /programs/days/:id\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /programs/days/:dayId/exercises\`
- **Body:** \`{ "exerciseId", "sets", "reps", "weight" }\`
- **Res:** \`{ "data": { "programExercise": { "id", "sets", "reps", "weight" } } }\`

### \`PATCH /programs/exercises/:id\`
- **Res:** \`{ "data": { "programExercise": { ... } } }\`

### \`DELETE /programs/exercises/:id\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /programs/:programId/assign\`
- **Body:** \`{ "studentId": "..." }\`
- **Res:** \`{ "data": { "assignment": { "id", "programId", "studentId" } } }\`

### \`POST /programs/:programId/assign-bulk\`
- **Body:** \`{ "studentIds": ["..."] }\`
- **Res:** \`{ "data": { "results": { "success": 2, "failed": 0, "errors": [] } } }\`

### \`POST /programs/log\` (شاگرد)
- **Body:** \`{ "programExerciseId", "actualSets", "actualReps", "actualWeight" }\`
- **Res:** \`{ "data": { "log": { "id", "actualSets", "actualReps", "actualWeight" } } }\`

### \`GET /programs/:programId/versions\`
- **Res:** \`{ "data": { "versions": [ { "id", "version", "createdAt" } ] } }\`

### \`POST /programs/:programId/versions/:versionId/revert\`
- **Res:** \`{ "success": true, "message": "..." }\`

---

## 👥 Groups (گروه‌ها)

### \`POST /groups\`
- **Body:** \`{ "name": "...", "capacity": 10 }\`
- **Res:** \`{ "data": { "group": { "id", "name", "capacity", "isActive" } } }\`

### \`GET /groups\`
- **Res:** \`{ "data": { "groups": [ { "id", "name", "capacity", "_count": { "members": 5 } } ] } }\`

### \`GET /groups/:id\`
- **Res:** \`{ "data": { "group": { "id", "name", "members": [ { "user": { "fullName" } } ] } } }\`

### \`PATCH /groups/:id\`
- **Res:** \`{ "data": { "group": { ... } } }\`

### \`DELETE /groups/:id\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /groups/:id/members\`
- **Body:** \`{ "userId": "..." }\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`DELETE /groups/:id/members/:userId\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`POST /groups/:id/assign-program\`
- **Body:** \`{ "programId": "..." }\`
- **Res:** \`{ "data": { "assignment": { "id", "programId", "groupId" } } }\`

### \`POST /groups/:id/members/:userId/override\`
- **Body:** \`{ "overrides": { "sets": 5 } }\`
- **Res:** \`{ "data": { "override": { "id", "overrides": {...} } } }\`

### \`GET /groups/:id/members/:userId/override\`
- **Res:** \`{ "data": { "override": { ... } } }\` (یا \`null\` اگر وجود نداشته باشد)

---

## 📁 Files (فایل‌ها)

### \`POST /files\` (multipart/form-data با فیلد \`file\`)
- **Res:** \`{ "data": { "file": { "id", "originalName", "path", "mimeType", "size" } } }\`

### \`GET /files\`
- **Res:** \`{ "data": { "files": [ { "id", "originalName", "path", "mimeType" } ] } }\`

### \`GET /files/:id/download\`
- **Res:** (فایل باینری - Blob)

### \`DELETE /files/:id\`
- **Res:** \`{ "success": true, "message": "..." }\`

---

## 💬 Chat (چت)

### \`POST /chats/private\`
- **Body:** \`{ "recipientId": "..." }\`
- **Res:** \`{ "data": { "conversation": { "id", "type" } } }\`

### \`POST /chats/group\`
- **Body:** \`{ "title": "...", "memberIds": ["..."] }\`
- **Res:** \`{ "data": { "conversation": { "id", "type", "title" } } }\`

### \`GET /chats\`
- **Res:** \`{ "data": { "conversations": [ { "id", "type", "unreadCount", "members": [ { "user": { "fullName" } } ], "messages": [ { "content" } ] } ] } }\`

### \`GET /chats/:id/messages?cursor=...&limit=50\`
- **Res:** \`{ "data": { "messages": [ { "id", "content", "sender": { "fullName" }, "createdAt" } ], "nextCursor": "uuid" } }\`

---

## 🔔 Notifications (اعلان‌ها)

### \`GET /notifications\`
- **Res:** \`{ "data": { "notifications": [ { "id", "title", "body", "isRead", "createdAt" } ] } }\`

### \`GET /notifications/unread-count\`
- **Res:** \`{ "data": { "count": 5 } }\`

### \`PATCH /notifications/read-all\`
- **Res:** \`{ "success": true, "message": "..." }\`

### \`PATCH /notifications/:id/read\`
- **Res:** \`{ "success": true, "message": "..." }\`

---

## ⚠️ ساختار خطا
\`\`\`json
{ "success": false, "message": "پیام خطا" }
\`\`\`
`;

fs.writeFileSync("API_DOCUMENTATION.md", content, "utf8");
console.log("✅ فایل API_DOCUMENTATION.md ساخته شد.");
