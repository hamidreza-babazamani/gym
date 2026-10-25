/**
 * سرویس شبیه‌سازی‌شده هوش مصنوعی.
 * دلیل اصلاح: اضافه کردن پاکسازی ورودی (Sanitize)، مدیریت خطا و Timeout.
 */
import { logger } from "../config/logger";
import { ApiError } from "../utils/ApiError";

// تابع پاکسازی ورودی برای جلوگیری از Prompt Injection
const sanitizeInput = (input: string): string => {
  // حذف کاراکترهای کنترلی و دستورات مخرب احتمالی
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, "");
  sanitized = sanitized.replace(/(ignore previous instructions|system prompt|role:|assistant:)/gi, "");
  return sanitized.trim();
};

export const generateAIResponse = async (userMessage: string, context: string): Promise<string> => {
  try {
    const safeMessage = sanitizeInput(userMessage);

    // شبیه‌سازی تاخیر مدل با مدیریت صحیح Timeout
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ApiError(504, "پاسخ AI با تاخیر مواجه شد. لطفاً دوباره تلاش کنید."));
      }, 5000);

      // شبیه‌سازی پردازش (۱ ثانیه)
      setTimeout(() => {
        clearTimeout(timeoutId);
        resolve();
      }, 1000);
    });

    const lowerMessage = safeMessage.toLowerCase();

    if (lowerMessage.includes("تمرین") || lowerMessage.includes("برنامه")) {
      return `بر اساس اطلاعات تمرینی شما: ${context}\n\nپیشنهاد من: برنامه تمرینی فعلی خود را ادامه دهید و روی تنوع حرکات تمرکز کنید.`;
    }

    if (lowerMessage.includes("تغذیه") || lowerMessage.includes("رژیم")) {
      return "برای بهترین نتیجه، پروتئین کافی مصرف کنید و آب کافی بنوشید. برای برنامه غذایی دقیق، با مربی خود مشورت کنید.";
    }

    if (lowerMessage.includes("وزن") || lowerMessage.includes("چربی")) {
      return `با توجه به آخرین ثبت‌های پیشرفت شما: ${context}\n\nادامه روند فعلی توصیه می‌شود.`;
    }

    return `پیام شما دریافت شد: "${safeMessage}"\n\nمن دستیار هوش مصنوعی باشگاه هستم. لطفاً سوال خود را دقیق‌تر بپرسید.`;
  } catch (error) {
    logger.error(`AI Service Error: ${error}`);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "خطا در ارتباط با سرویس هوش مصنوعی.");
  }
};