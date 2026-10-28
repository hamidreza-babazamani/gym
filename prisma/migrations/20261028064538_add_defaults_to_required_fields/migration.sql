/*
  Warnings:

  - A unique constraint covering the columns `[user_id,idempotency_key]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "coach_students" ALTER COLUMN "initiated_by" SET DEFAULT 'STUDENT';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "duration_days" SET DEFAULT 30;

-- CreateIndex
CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key" ON "orders"("user_id", "idempotency_key");
