-- جلوگیری از عضویت فعال تکراری در سطح دیتابیس (فقط برای وضعیت ACTIVE)
CREATE UNIQUE INDEX "unique_active_membership" 
ON "memberships" ("user_id", "sport_id") 
WHERE "status" = 'ACTIVE';