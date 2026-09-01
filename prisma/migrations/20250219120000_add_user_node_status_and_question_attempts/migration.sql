-- DropForeignKey
ALTER TABLE "parent_notifications" DROP CONSTRAINT "fk_parent_notifications_parent";

-- DropForeignKey
ALTER TABLE "parent_notifications" DROP CONSTRAINT "fk_parent_notifications_pupil";

-- DropIndex
DROP INDEX "idx_subjects_academic_year_id";

-- DropIndex
DROP INDEX "idx_subjects_code";

-- DropTable
DROP TABLE "parent_notifications";

-- CreateTable
CREATE TABLE "user_node_status" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "progress_data" JSONB,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_node_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_question_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "practice_question_id" UUID,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "is_correct" BOOLEAN,
    "points_earned" INTEGER DEFAULT 0,
    "response_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "final_challenge_id" UUID,
    "question_type" TEXT NOT NULL DEFAULT 'practice',

    CONSTRAINT "user_practice_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_user_node_status_node_id" ON "user_node_status"("node_id");

-- CreateIndex
CREATE INDEX "idx_user_node_status_user_id" ON "user_node_status"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_node_status_user_id_node_id_key" ON "user_node_status"("user_id", "node_id");

-- CreateIndex
CREATE INDEX "idx_user_practice_attempts_question_id" ON "user_question_attempts"("practice_question_id");

-- CreateIndex
CREATE INDEX "idx_user_practice_attempts_user_id" ON "user_question_attempts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_practice_attempts_user_id_question_id_attempt_number_key" ON "user_question_attempts"("user_id", "practice_question_id", "attempt_number");

-- RenameForeignKey
ALTER TABLE "subjects" RENAME CONSTRAINT "fk_subjects_academic_year" TO "subjects_academic_year_id_fkey";

-- AddForeignKey
ALTER TABLE "subject_structure" ADD CONSTRAINT "subject_structure_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_node_status" ADD CONSTRAINT "fk_user_node_status_pupil" FOREIGN KEY ("user_id") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_node_status" ADD CONSTRAINT "user_node_status_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "subject_structure"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_question_attempts" ADD CONSTRAINT "fk_user_practice_attempts_pupil" FOREIGN KEY ("user_id") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_question_attempts" ADD CONSTRAINT "user_question_attempts_final_challenge_id_fkey" FOREIGN KEY ("final_challenge_id") REFERENCES "lesson_final_challenges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_question_attempts" ADD CONSTRAINT "user_question_attempts_practice_question_id_fkey" FOREIGN KEY ("practice_question_id") REFERENCES "lesson_practice_questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

