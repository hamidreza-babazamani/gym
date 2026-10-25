/**
 * تابع کمکی برای ثبت Audit Log.
 * دلیل استفاده: ثبت یکپارچه عملیات حساس ادمین در دیتابیس.
 */
import prisma from "../lib/prisma";
import { logger } from "../config/logger";

interface AuditLogParams {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (params: AuditLogParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    // ثبت خطای Audit Log نباید باعث شکست عملیات اصلی بشه
    logger.error(`Failed to create audit log: ${error}`);
  }
};