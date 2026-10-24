-- CreateTable
CREATE TABLE "progress_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "weight" DOUBLE PRECISION,
    "body_fat" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "arms" DOUBLE PRECISION,
    "legs" DOUBLE PRECISION,
    "notes" TEXT,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_notes" (
    "id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progress_logs_user_id_recorded_at_idx" ON "progress_logs"("user_id", "recorded_at");

-- CreateIndex
CREATE INDEX "progress_notes_student_id_idx" ON "progress_notes"("student_id");

-- CreateIndex
CREATE INDEX "progress_notes_coach_id_idx" ON "progress_notes"("coach_id");

-- AddForeignKey
ALTER TABLE "progress_logs" ADD CONSTRAINT "progress_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_notes" ADD CONSTRAINT "progress_notes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_notes" ADD CONSTRAINT "progress_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
