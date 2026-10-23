/*
  Warnings:

  - A unique constraint covering the columns `[program_id,group_id]` on the table `program_assignments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "program_assignments" ADD COLUMN     "group_id" UUID,
ALTER COLUMN "student_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "program_assignments_group_id_is_active_idx" ON "program_assignments"("group_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "program_assignments_program_id_group_id_key" ON "program_assignments"("program_id", "group_id");

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
