/**
 * قوانین اعتبارسنجی برای مسیرهای چت.
 * دلیل اصلاح نهایی: اضافه کردن محدودیت تعداد اعضا برای گروه و اعتبارسنجی دقیق‌تر محتوای پیام.
 */
import { z } from "zod";

export const createPrivateConversationSchema = z.object({
  body: z.object({
    recipientId: z.string().uuid("شناسه کاربر معتبر نیست."),
  }),
});

export const createGroupConversationSchema = z.object({
  body: z.object({
    title: z.string().min(2, "نام گروه باید حداقل ۲ کاراکتر باشد.").max(150),
    memberIds: z.array(z.string().uuid("شناسه کاربر معتبر نیست."))
      .min(1, "حداقل یک عضو باید انتخاب شود.")
      .max(100, "حداکثر ۱۰۰ عضو برای گروه مجاز است."),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().max(2000, "محتوای پیام بیش از حد طولانی است.").optional(),
    fileId: z.string().uuid("شناسه فایل معتبر نیست.").optional(),
    replyToId: z.string().uuid("شناسه پاسخ معتبر نیست.").optional(),
  }).refine(data => (data.content && data.content.trim().length > 0) || data.fileId, {
    message: "پیام باید محتوا یا فایل داشته باشد.",
  }),
});