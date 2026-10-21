/**
 * کلاس سفارشی برای مدیریت خطاها.
 * دلیل استفاده: یکپارچه‌سازی ارسال خطاها در کل برنامه. 
 * به جای هندل کردن دستی ریسپانس‌ها در کنترلرها، فقط این کلاس را throw می‌کنیم و میدل‌ور مرکزی آن را هندل می‌کند.
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // تنظیم پروتوتایپ برای کارکرد صحیح instanceof در TypeScript
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}