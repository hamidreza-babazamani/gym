/**
 * مسیرهای مربوط به مدیریت چت.
 * دلیل استفاده: تعریف Endpointهای ایجاد مکالمه و دریافت پیام‌ها.
 */
import { Router } from "express";
import {
  createPrivateConversation,
  createGroupConversation,
  listConversations,
  getConversationMessages,
} from "../controllers/chat.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createPrivateConversationSchema,
  createGroupConversationSchema,
} from "../validations/chat.validation";

const router = Router();

// ایجاد مکالمه خصوصی
router.post("/private", authMiddleware, validate(createPrivateConversationSchema), createPrivateConversation);

// ایجاد مکالمه گروهی
router.post("/group", authMiddleware, validate(createGroupConversationSchema), createGroupConversation);

// دریافت لیست مکالمات
router.get("/", authMiddleware, listConversations);

// دریافت تاریخچه پیام‌های یک مکالمه
router.get("/:id/messages", authMiddleware, getConversationMessages);

export default router;