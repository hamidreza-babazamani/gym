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
import { env } from "../config/env";

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

// --- Mock Gateway for Development ---
router.get("/mock-gateway", (req, res) => {
  if (!env.MOCK_PAYMENT_ENABLED) {
    return res.status(404).json({ success: false, message: "Not found" });
  }

  const { authority } = req.query;
  if (!authority) {
    return res.status(400).send("Authority is required");
  }

  // یک صفحه HTML ساده برای شبیه‌سازی درگاه
  return res.send(`
    <html dir="rtl">
      <head><title>درگاه پرداخت تستی</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f0f0f0;">
        <div style="background: white; padding: 30px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <h2>درگاه پرداخت (Mock)</h2>
          <p>کد رهگیری: ${authority}</p>
          <hr/>
          <form method="POST" action="/api/v1/payments/verify">
            <input type="hidden" name="authority" value="${authority}" />
            <!-- دکمه موفق -->
            <button name="status" value="OK" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;">
              پرداخت موفق
            </button>
            <!-- دکمه ناموفق -->
            <button name="status" value="FAILED" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              پرداخت ناموفق
            </button>
          </form>
        </div>
      </body>
    </html>
  `);
});

export default router;