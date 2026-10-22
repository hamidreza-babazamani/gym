/**
 * پاکسازی اطلاعات کاربر.
 * دلیل استفاده: جلوگیری از نشت فیلدهای حساس مثل passwordHash.
 */
export const sanitizeUser = (user: any) => {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    roles: user.roles?.map((r: any) => r.role) || [],
  };
};