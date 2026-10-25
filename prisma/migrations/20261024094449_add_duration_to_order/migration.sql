/*
  Warnings:

  - Added the required column `duration_days` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "duration_days" INTEGER NOT NULL;
