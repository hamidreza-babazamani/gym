
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { sendError } from "../utils/api-response";

// بررسی اینکه کاربر نقش موردنیاز را دارد یا نه
const requireRole = (...allowedRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return sendError(res, "ابتدا وارد حساب کاربری شوید.", 401);
    }

    if (!req.user.roles.some((role) => allowedRoles.includes(role))) {
      return sendError(res, "شما اجازه دسترسی به این بخش را ندارید.", 403);
    }

    next();
  };
};

export default requireRole;
