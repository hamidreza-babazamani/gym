/**
 * کنترلرهای مدیریت اشتراک و پرداخت.
 * دلیل اصلاح نهایی: بررسی وضعیت CANCELLED و expireOldMemberships برای جلوگیری از ایجاد عضویت تکراری.
 */
import { Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { sendSuccess } from "../utils/api-response";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { expireOldMemberships } from "../utils/membership.utils";

const generateAuthority = () => `MOCK-${crypto.randomBytes(16).toString("hex")}`;

// ایجاد پلن جدید (فقط ادمین)
export const createPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, price, interval, durationDays } = req.body;
  
  if (durationDays <= 0) throw new ApiError(400, "مدت اعتبار باید بزرگ‌تر از صفر باشد.");

  const plan = await prisma.subscriptionPlan.create({
    data: { name, description, price, interval: interval || "MONTHLY", durationDays },
  });
  return sendSuccess(res, "پلن با موفقیت ایجاد شد.", { plan }, 201);
});

// دریافت لیست پلن‌های فعال
export const listPlans = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });
  return sendSuccess(res, "لیست پلن‌ها دریافت شد.", { plans });
});

// ایجاد سفارش
export const createOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { planId, idempotencyKey } = req.body;

  const plan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) throw new ApiError(404, "پلن پیدا نشد یا غیرفعال است.");

  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
    if (existing) return sendSuccess(res, "سفارش قبلاً ایجاد شده است.", { order: existing });
  }

  const order = await prisma.order.create({
    data: { 
      userId, 
      planId, 
      amount: plan.price, 
      durationDays: plan.durationDays,
      idempotencyKey: idempotencyKey || null, 
      status: "PENDING" 
    },
  });

  return sendSuccess(res, "سفارش با موفقیت ایجاد شد.", { order }, 201);
});

// شروع پرداخت
export const initiatePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const orderId = String(req.params.orderId);
  const userId = req.user!.id;

  const order = await prisma.order.findFirst({ where: { id: orderId, userId, status: "PENDING" } });
  if (!order) throw new ApiError(404, "سفارش پیدا نشد یا قابل پرداخت نیست.");

  const existingPayment = await prisma.payment.findFirst({
    where: { orderId: order.id, status: "PENDING" },
  });
  
  if (existingPayment) {
    const url = `http://localhost:5000/api/v1/payments/mock-gateway?authority=${existingPayment.authority}`;
    return sendSuccess(res, "به درگاه پرداخت هدایت شوید.", { paymentUrl: url, authority: existingPayment.authority });
  }

  const authority = generateAuthority();
  await prisma.payment.create({
    data: { orderId: order.id, amount: order.amount, status: "PENDING", authority, gatewayName: "MOCK" },
  });

  const paymentUrl = `http://localhost:5000/api/v1/payments/mock-gateway?authority=${authority}`;
  return sendSuccess(res, "به درگاه پرداخت هدایت شوید.", { paymentUrl, authority });
});

// تأیید پرداخت و فعال‌سازی/تمدید اشتراک (با عملیات اتمیک برای جلوگیری از Race Condition)
export const verifyPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { authority, status } = req.body;
  const userId = req.user!.id;

  const payment = await prisma.payment.findUnique({
    where: { authority },
    include: { order: true },
  });
  
  if (!payment) throw new ApiError(404, "تراکنش پیدا نشد.");
  if (payment.order.userId !== userId) throw new ApiError(403, "این تراکنش متعلق به شما نیست.");

  if (status === "OK") {
    await prisma.$transaction(async (tx) => {
      // ۱. آپدیت اتمیک تراکنش (فقط اگر PENDING باشد)
      const updatedPayment = await tx.payment.updateMany({
        where: { 
          id: payment.id, 
          status: "PENDING"  // ← شرط حیاتی
        },
        data: { 
          status: "SUCCESS", 
          refId: `REF-${crypto.randomBytes(8).toString("hex")}`,
          transactionId: `TXN-${crypto.randomUUID()}`
        },
      });

      // اگر count = 0 باشد، یعنی درخواست دیگری زودتر اون رو آپدیت کرده
      if (updatedPayment.count === 0) {
        throw new ApiError(400, "این تراکنش قبلاً پردازش شده است.");
      }

      // ۲. آپدیت اتمیک سفارش (فقط اگر PENDING باشد)
      const updatedOrder = await tx.order.updateMany({
        where: { 
          id: payment.orderId, 
          status: "PENDING" 
        },
        data: { status: "PAID" },
      });

      if (updatedOrder.count === 0) {
        throw new ApiError(400, "این سفارش قبلاً پرداخت شده است.");
      }

      // ۳. فعال‌سازی یا تمدید عضویت
      const firstSport = await tx.sport.findFirst({ where: { isActive: true } });
      if (firstSport) {
        const now = new Date();
        
        const existingMembership = await tx.membership.findFirst({
          where: { 
            userId: payment.order.userId, 
            sportId: firstSport.id,
            status: { in: ["ACTIVE", "CANCELLED", "EXPIRED"] }
          },
          orderBy: { createdAt: "desc" }
        });

        if (existingMembership) {
          let newEndsAt = new Date();
          if (existingMembership.status === "ACTIVE" && existingMembership.endsAt > now) {
            newEndsAt = new Date(existingMembership.endsAt);
          }
          newEndsAt.setDate(newEndsAt.getDate() + payment.order.durationDays);

          await tx.membership.update({
            where: { id: existingMembership.id },
            data: { 
              status: "ACTIVE", 
              startsAt: existingMembership.status === "ACTIVE" ? existingMembership.startsAt : now,
              endsAt: newEndsAt 
            },
          });
        } else {
          const endsAt = new Date(now);
          endsAt.setDate(endsAt.getDate() + payment.order.durationDays);
          await tx.membership.create({
            data: { userId: payment.order.userId, sportId: firstSport.id, startsAt: now, endsAt, status: "ACTIVE" },
          });
        }
      }
    });

    return sendSuccess(res, "پرداخت با موفقیت انجام شد و اشتراک فعال/تمدید شد.");
  } else {
    // پرداخت ناموفق (با عملیات اتمیک)
    await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "FAILED" },
      });

      if (updatedPayment.count === 0) {
        throw new ApiError(400, "این تراکنش قبلاً پردازش شده است.");
      }

      await tx.order.updateMany({
        where: { id: payment.orderId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    });
    throw new ApiError(400, "پرداخت ناموفق بود.");
  }
});

// لیست سفارش‌های کاربر
export const listOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      plan: { select: { name: true, price: true } },
      payments: { select: { status: true, refId: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return sendSuccess(res, "لیست سفارش‌ها دریافت شد.", { orders });
});