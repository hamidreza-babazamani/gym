/**
 * میدل‌ور اعتبارسنجی ورودی‌ها با Zod.
 * دلیل آپدیت: تغییر AnyZodObject به ZodObject طبق نسخه جدید Zod.
 */
import { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";

export const validate = (schema: ZodObject<any>) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};