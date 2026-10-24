/**
 * مسیرهای مربوط به مدیریت اشتراک و پرداخت.
 * دلیل استفاده: تعریف Endpointهای مدیریت پلن، سفارش و پرداخت.
 */
import { Router } from "express";
import {
  createPlan,
  listPlans,
  createOrder,
  initiatePayment,
  verifyPayment,
  listOrders,
} from "../controllers/payment.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createPlanSchema,
  createOrderSchema,
  verifyPaymentSchema,
} from "../validations/payment.validation";

const router = Router();

// مدیریت پلن‌ها
router.post(
  "/plans",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate(createPlanSchema),
  createPlan
);

router.get("/plans", authMiddleware, listPlans);

// مدیریت سفارش‌ها
router.post("/orders", authMiddleware, validate(createOrderSchema), createOrder);
router.get("/orders", authMiddleware, listOrders);

// شروع پرداخت
router.post("/orders/:orderId/pay", authMiddleware, initiatePayment);

// تأیید پرداخت (Callback)
router.post("/verify", authMiddleware, validate(verifyPaymentSchema), verifyPayment);

export default router;