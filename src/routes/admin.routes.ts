import { Router, Response } from "express";
import authMiddleware, {
  AuthenticatedRequest,
} from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { sendSuccess } from "../utils/api-response";
import { promoteToCoach } from "../controllers/admin.controller";

const router = Router();

router.patch(
  "/users/:userId/promote-to-coach",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  promoteToCoach
);

// فقط Super Admin اجازه دسترسی دارد
router.get(
  "/dashboard",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  (req: AuthenticatedRequest, res: Response) => {
    return sendSuccess(res, "دسترسی Super Admin تأیید شد.", {
      userId: req.user?.id,
      roles: req.user?.roles,
    });
  }
);

export default router;
