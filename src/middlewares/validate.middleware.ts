/**
 * میدل‌ور اعتبارسنجی ورودی‌ها با Zod.
 * دلیل اصلاح: جایگزینی req.body با داده‌های تمیزشده و استفاده از تایپ دقیق به جای any.
 */
import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodRawShape } from "zod";

export const validate = (schema: ZodObject<ZodRawShape>) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body) {
        req.body = parsed.body;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};