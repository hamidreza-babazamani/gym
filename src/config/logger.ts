/**
 * کانفیگ سیستم لاگ‌گیری با Pino.
 * دلیل استفاده: تولید لاگ‌های ساختاریافته (JSON) برای محیط پروداکشن و لاگ‌های خوانا برای محیط توسعه.
 */
import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  // در محیط توسعه لاگ‌ها را رنگی و ساده چاپ می‌کند
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});