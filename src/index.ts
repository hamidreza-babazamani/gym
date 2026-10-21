/**
 * فایل اصلی برای راه‌اندازی سرور.
 * دلیل استفاده از env: به جای خواندن مستقیم process.env، از کانفیگ معتبرسنجی‌شده استفاده می‌کنیم تا مطمئن شویم پورت درست است.
 */
import app from "./app";
import { env } from "./config/env";

// اجرای سرور با پورت خوانده‌شده از کانفیگ
app.listen(env.PORT, () => {
  console.log(`Gym Backend is running on http://localhost:${env.PORT}`);
});