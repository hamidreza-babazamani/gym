/*
  Warnings:

  - A unique constraint covering the columns `[coach_id,student_id,sport_id]` on the table `coach_students` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `initiated_by` to the `coach_students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sport_id` to the `coach_students` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CoachStudentInitiator" AS ENUM ('COACH', 'STUDENT');

-- DropIndex
DROP INDEX "coach_students_coach_id_student_id_key";

-- AlterTable
ALTER TABLE "coach_students" ADD COLUMN     "ended_at" TIMESTAMPTZ(3),
ADD COLUMN     "ended_reason" VARCHAR(500),
ADD COLUMN     "initiated_by" "CoachStudentInitiator" NOT NULL,
ADD COLUMN     "sport_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "coach_students_sport_id_status_idx" ON "coach_students"("sport_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "coach_students_coach_id_student_id_sport_id_key" ON "coach_students"("coach_id", "student_id", "sport_id");

-- AddForeignKey
ALTER TABLE "coach_students" ADD CONSTRAINT "coach_students_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
