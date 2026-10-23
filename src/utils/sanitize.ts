/**
 * پاکسازی اطلاعات کاربر.
 * دلیل اصلاح: استفاده از تایپ دقیق به جای any.
 */
import { User, UserRole } from "../../generated/prisma/client";

type UserWithRoles = User & {
  roles?: { role: string }[];
};

export const sanitizeUser = (user: UserWithRoles) => {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    roles: user.roles?.map((r) => r.role) || [],
  };
};