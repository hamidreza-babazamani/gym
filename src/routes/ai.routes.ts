/**
 * مسیرهای مربوط به دستیار هوش مصنوعی.
 * دلیل استفاده: تعریف Endpointهای چت با AI و تاریخچه مکالمات.
 */
import { Router } from "express";
import {
  chatWithAI,
  getAIConversationHistory,
} from "../controllers/ai.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { chatWithAISchema } from "../validations/ai.validation";

const router = Router();

// چت با دستیار AI
router.post("/chat", authMiddleware, validate(chatWithAISchema), chatWithAI);

// دریافت تاریخچه مکالمات AI
router.get("/history", authMiddleware, getAIConversationHistory);

export default router;