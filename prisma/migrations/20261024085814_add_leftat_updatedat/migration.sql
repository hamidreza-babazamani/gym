/*
  Warnings:

  - Added the required column `updated_at` to the `progress_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `progress_notes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "coach_students" ADD COLUMN     "left_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "progress_logs" ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL;

-- AlterTable
ALTER TABLE "progress_notes" ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL;
