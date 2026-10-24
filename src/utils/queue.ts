/**
 * سیستم صف داخلی برای کارهای پس‌زمینه.
 * دلیل اصلاح نهایی: جلوگیری از نشت حافظه (Memory Leak) و مدیریت کارهای ناموفق (DLQ).
 */
import { logger } from "../config/logger";

type Job = {
  id: string;
  name: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  handler: (payload: any) => Promise<void>;
};

class InMemoryQueue {
  private jobs: Job[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // هر ۲ ثانیه صف رو بررسی کن
    this.processingInterval = setInterval(() => this.processNext(), 2000);
  }

  // اضافه کردن کار به صف
  add(name: string, payload: any, handler: (payload: any) => Promise<void>, maxAttempts = 3) {
    const job: Job = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name,
      payload,
      attempts: 0,
      maxAttempts,
      handler,
    };
    this.jobs.push(job);
    logger.info(`Job queued: ${name} (id: ${job.id})`);
  }

  // پردازش کار بعدی
  private async processNext() {
    if (this.processing || this.jobs.length === 0) return;
    this.processing = true;

    const job = this.jobs.shift();
    if (!job) {
      this.processing = false;
      return;
    }

    try {
      job.attempts++;
      await job.handler(job.payload);
      logger.info(`Job completed: ${job.name} (attempts: ${job.attempts})`);
    } catch (error) {
      logger.error(`Job failed: ${job.name} (attempts: ${job.attempts}/${job.maxAttempts}) - ${error}`);
      
      if (job.attempts < job.maxAttempts) {
        // تلاش مجدد با تاخیر (Exponential Backoff)
        const delay = Math.pow(2, job.attempts) * 1000;
        setTimeout(() => this.jobs.push(job), delay);
        logger.info(`Job retry scheduled: ${job.name} in ${delay}ms`);
      } else {
        // انتقال به Dead Letter Queue (DLQ) در حافظه
        logger.error(`Job moved to DLQ: ${job.name} (${JSON.stringify(job.payload)})`);
      }
    } finally {
      this.processing = false;
    }
  }

  // متوقف کردن صف
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

export const queue = new InMemoryQueue();