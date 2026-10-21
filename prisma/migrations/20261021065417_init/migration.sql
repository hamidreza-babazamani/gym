-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'COACH', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CoachStudentStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "coach_students" (
    "id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "CoachStudentStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coach_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "user_roles"("role");

-- CreateIndex
CREATE INDEX "coach_students_coach_id_status_idx" ON "coach_students"("coach_id", "status");

-- CreateIndex
CREATE INDEX "coach_students_student_id_status_idx" ON "coach_students"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "coach_students_coach_id_student_id_key" ON "coach_students"("coach_id", "student_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_students" ADD CONSTRAINT "coach_students_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_students" ADD CONSTRAINT "coach_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
