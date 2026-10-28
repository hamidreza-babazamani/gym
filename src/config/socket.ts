/**
 * پیکربندی Socket.IO.
 * دلیل اصلاح نهایی: به‌روزرسانی updatedAt مکالمه هنگام ارسال پیام و بهبود مدیریت خطا.
 */
import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { env } from "./env";
import prisma from "../lib/prisma";
import { logger } from "./logger";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let io: Server;

const messageRateLimit = new Map<string, { count: number; lastReset: number }>();
const MESSAGE_RATE_WINDOW = 10000;
const MESSAGE_RATE_MAX = 10;
const joinRateLimit = new Map<string, { count: number; lastReset: number }>();
const typingRateLimit = new Map<string, number>();
const TYPING_RATE_WINDOW = 1000;

const isValidUUID = (uuid: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: env.NODE_ENV === "production" 
        ? [process.env.FRONTEND_URL || "https://yourdomain.com"] 
        : ["http://localhost:3000", "http://localhost:5173"],
      credentials: true,
    },
  });

  // ۱. احراز هویت اتصال
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("توکن ارسال نشده است."));

      const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      if (!decoded.sub) return next(new Error("توکن نامعتبر است."));

      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user || user.status !== "ACTIVE") {
        return next(new Error("حساب کاربری معتبر یا فعال نیست."));
      }

      socket.userId = decoded.sub;
      next();
    } catch (error) {
      return next(new Error("احراز هویت ناموفق بود."));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info(`User connected: ${userId}`);
    socket.join(`user:${userId}`);

    // ۲. پیوستن به اتاق مکالمه
    socket.on("conversation:join", async (conversationId: unknown) => {
      try {
        if (typeof conversationId !== "string" || !isValidUUID(conversationId)) {
          return socket.emit("error", { message: "شناسه مکالمه معتبر نیست." });
        }

        const now = Date.now();
        const userJoinRate = joinRateLimit.get(userId) || { count: 0, lastReset: now };
        if (now - userJoinRate.lastReset > 60000) {
          userJoinRate.count = 0;
          userJoinRate.lastReset = now;
        }
        if (userJoinRate.count >= 10) {
          return socket.emit("error", { message: "تعداد درخواست‌های شما بیش از حد مجاز است." });
        }
        userJoinRate.count++;
        joinRateLimit.set(userId, userJoinRate);

        const member = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!member || member.leftAt) {
          return socket.emit("error", { message: "شما عضو فعال این مکالمه نیستید." });
        }
        
        socket.join(`conversation:${conversationId}`);
        socket.emit("conversation:joined", { conversationId });
      } catch (error) {
        logger.error(`Socket error (conversation:join): ${error}`);
        socket.emit("error", { message: "خطا در پیوستن به مکالمه." });
      }
    });

    socket.on("conversation:leave", (conversationId: unknown) => {
      if (typeof conversationId === "string" && isValidUUID(conversationId)) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // ۳. ارسال پیام
    socket.on("message:send", async (data: any) => {
      try {
        if (!data || typeof data !== "object") return socket.emit("error", { message: "داده‌های نامعتبر." });
        const { conversationId, content, replyToId, fileId } = data;

        if (typeof conversationId !== "string" || !isValidUUID(conversationId)) {
          return socket.emit("error", { message: "شناسه مکالمه معتبر نیست." });
        }
        if (replyToId && (typeof replyToId !== "string" || !isValidUUID(replyToId))) {
          return socket.emit("error", { message: "شناسه پاسخ معتبر نیست." });
        }
        if (fileId && (typeof fileId !== "string" || !isValidUUID(fileId))) {
          return socket.emit("error", { message: "شناسه فایل معتبر نیست." });
        }

        const now = Date.now();
        const userRate = messageRateLimit.get(userId) || { count: 0, lastReset: now };
        if (now - userRate.lastReset > MESSAGE_RATE_WINDOW) {
          userRate.count = 0;
          userRate.lastReset = now;
        }
        if (userRate.count >= MESSAGE_RATE_MAX) {
          return socket.emit("error", { message: "تعداد پیام‌های شما بیش از حد مجاز است." });
        }
        userRate.count++;
        messageRateLimit.set(userId, userRate);

        if ((!content || content.trim().length === 0) && !fileId) {
          return socket.emit("error", { message: "محتوای پیام نمی‌تواند خالی باشد." });
        }
        if (content && content.length > 2000) {
          return socket.emit("error", { message: "محتوای پیام بیش از حد طولانی است." });
        }

        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conversation) return socket.emit("error", { message: "مکالمه پیدا نشد." });

        const member = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!member || member.leftAt) {
          return socket.emit("error", { message: "شما عضو فعال این مکالمه نیستید." });
        }

        if (fileId) {
          const file = await prisma.file.findUnique({ where: { id: fileId } });
          if (!file || file.ownerId !== userId) return socket.emit("error", { message: "فایل پیوست معتبر نیست." });
        }

        if (replyToId) {
          const repliedMessage = await prisma.message.findUnique({ where: { id: replyToId } });
          if (!repliedMessage || repliedMessage.conversationId !== conversationId) {
            return socket.emit("error", { message: "پیام پاسخ معتبر نیست." });
          }
        }

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content: content || null,
            fileId: fileId || null,
            replyToId: replyToId || null,
          },
          include: {
            sender: { select: { id: true, fullName: true } },
            file: { select: { id: true, originalName: true, path: true, mimeType: true } },
          },
        });

        // به‌روزرسانی updatedAt مکالمه
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        const members = await prisma.conversationMember.findMany({
          where: { conversationId, leftAt: null },
          select: { userId: true },
        });

        for (const m of members) {
          io.to(`user:${m.userId}`).emit("message:new", message);
        }
      } catch (error) {
        logger.error(`Socket error (message:send): ${error}`);
        socket.emit("error", { message: "خطا در ارسال پیام." });
      }
    });

    // ۴. وضعیت تایپ کردن
    socket.on("typing:start", async (data: any) => {
      try {
        if (!data || typeof data.conversationId !== "string" || !isValidUUID(data.conversationId)) return;

        const now = Date.now();
        const lastTyping = typingRateLimit.get(userId) || 0;
        if (now - lastTyping < TYPING_RATE_WINDOW) return;
        typingRateLimit.set(userId, now);

        const senderMember = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId: data.conversationId, userId } },
        });
        if (!senderMember || senderMember.leftAt) return;

        const members = await prisma.conversationMember.findMany({
          where: { conversationId: data.conversationId, leftAt: null, NOT: { userId } },
          select: { userId: true },
        });
        for (const m of members) {
          io.to(`user:${m.userId}`).emit("typing", { 
            userId, conversationId: data.conversationId, isTyping: true 
          });
        }
      } catch (error) {
        logger.error(`Socket error (typing:start): ${error}`);
      }
    });

    socket.on("typing:stop", async (data: any) => {
      try {
        if (!data || typeof data.conversationId !== "string" || !isValidUUID(data.conversationId)) return;

        const senderMember = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId: data.conversationId, userId } },
        });
        if (!senderMember || senderMember.leftAt) return;

        const members = await prisma.conversationMember.findMany({
          where: { conversationId: data.conversationId, leftAt: null, NOT: { userId } },
          select: { userId: true },
        });
        for (const m of members) {
          io.to(`user:${m.userId}`).emit("typing", { 
            userId, conversationId: data.conversationId, isTyping: false 
          });
        }
      } catch (error) {
        logger.error(`Socket error (typing:stop): ${error}`);
      }
    });

    // ۵. قطع اتصال
    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${userId}`);
      messageRateLimit.delete(userId);
      joinRateLimit.delete(userId);
      typingRateLimit.delete(userId);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};
// F-09 fix: Force disconnect user's active sockets on suspend/logout
export const disconnectUser = (userId: string) => {
  if (!io) return;
  io.in(`user:${userId}`).disconnectSockets(true);
  logger.info(`User ${userId} disconnected due to status change or logout.`);
};