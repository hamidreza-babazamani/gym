/**
 * مسیرهای مربوط به مدیریت گروه‌ها.
 */
import { Router } from "express";
import {
  createGroup,
  listGroups,
  getGroup,
  updateGroup,
  addMember,
  removeMember,
  assignProgramToGroup,
  deleteGroup,
} from "../controllers/group.controller";
import authMiddleware from "../middlewares/auth.middleware";
import requireRole from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  assignProgramToGroupSchema,
} from "../validations/group.validation";

const router = Router();

router.post("/", authMiddleware, requireRole("COACH", "ADMIN", "SUPER_ADMIN"), validate(createGroupSchema), createGroup);
router.get("/", authMiddleware, requireRole("COACH", "ADMIN", "SUPER_ADMIN"), listGroups);
router.get("/:id", authMiddleware, requireRole("COACH", "ADMIN", "SUPER_ADMIN"), getGroup);
router.patch("/:id", authMiddleware, requireRole("COACH", "ADMIN", "SUPER_ADMIN"), validate(updateGroupSchema), updateGroup);
router.delete("/:id", authMiddleware, requireRole("COACH", "ADMIN", "SUPER_ADMIN"), deleteGroup);
router.post("/:id/members", authMiddleware, requireRole("COACH", "ADMIN", "SUPER_ADMIN"), validate(addMemberSchema), addMember);
router.delete("/:id/members/:userId", authMiddleware, requireRole("COACH", "ADMIN", "SUPER_ADMIN"), removeMember);
router.post("/:id/assign-program", authMiddleware, requireRole("COACH", "ADMIN", "SUPER_ADMIN"), validate(assignProgramToGroupSchema), assignProgramToGroup);

export default router;