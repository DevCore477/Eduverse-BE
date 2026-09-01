-- CreateEnum
CREATE TYPE "enum_node_type" AS ENUM ('segment', 'unit', 'topic', 'project', 'sequence', 'lesson', 'level', 'root');

-- CreateEnum
CREATE TYPE "enum_step_type" AS ENUM ('lesson_intro', 'lesson_video', 'practice_questions', 'final_journey');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('created', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('pending', 'active', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "grade" INTEGER,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_final_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "node_id" UUID NOT NULL,
    "challenge_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "lesson_final_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_practice_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "node_id" UUID NOT NULL,
    "question_json" JSONB NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 3,
    "order_index" SERIAL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_practice_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_step_content" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "step_id" UUID NOT NULL,
    "background_image_url" TEXT,
    "tts_audio_url" TEXT,
    "karaoke_json" JSONB,
    "video_url" TEXT,
    "skip_available_after_seconds" INTEGER DEFAULT 10,
    "extras" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_step_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "node_id" UUID NOT NULL,
    "step_type" "enum_step_type" NOT NULL,
    "order_index" INTEGER NOT NULL,
    "unlock_rule" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID NOT NULL,
    "subscription_plan_id" UUID NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "status" "subscription_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "pin_code" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "phone_number" TEXT,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_subscription_id" UUID NOT NULL,
    "chargily_session_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "payment_status" NOT NULL DEFAULT 'created',
    "payment_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupils" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "avatar_url" TEXT,
    "pin_code" TEXT,
    "current_year_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_name" TEXT NOT NULL,

    CONSTRAINT "pupils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_unlock_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "step_id" UUID NOT NULL,
    "depends_on" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_unlock_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_structure" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" UUID NOT NULL,
    "parent_id" UUID,
    "node_type" "enum_node_type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "payload" JSONB,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "journey_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "academic_year_id" UUID NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "max_devices" INTEGER NOT NULL,
    "max_profiles" INTEGER NOT NULL,
    "allowed_years" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lesson_step_status" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "extra_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_lesson_step_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_milestone_badges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "badge_name" VARCHAR(255) NOT NULL,
    "badge_icon_url" TEXT,
    "description" TEXT,
    "awarded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_milestone_badges_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "academic_years_name_key" ON "academic_years"("name");

-- CreateIndex
CREATE INDEX "idx_final_challenges_node_id" ON "lesson_final_challenges"("node_id");

-- CreateIndex
CREATE INDEX "idx_practice_questions_node_id" ON "lesson_practice_questions"("node_id");

-- CreateIndex
CREATE INDEX "idx_lesson_step_content_step_id" ON "lesson_step_content"("step_id");

-- CreateIndex
CREATE INDEX "idx_lesson_steps_node_id" ON "lesson_steps"("node_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_steps_node_id_step_type_key" ON "lesson_steps"("node_id", "step_type");

-- CreateIndex
CREATE UNIQUE INDEX "parents_email_key" ON "parents"("email");

-- CreateIndex
CREATE INDEX "idx_step_unlock_rules_step_id" ON "step_unlock_rules"("step_id");

-- CreateIndex
CREATE INDEX "idx_subject_structure_parent_id" ON "subject_structure"("parent_id");

-- CreateIndex
CREATE INDEX "idx_subject_structure_subject_id" ON "subject_structure"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_plan_code_key" ON "subscription_plans"("plan_code");

-- CreateIndex
CREATE INDEX "idx_user_lesson_step_status_step_id" ON "user_lesson_step_status"("step_id");

-- CreateIndex
CREATE INDEX "idx_user_lesson_step_status_user_id" ON "user_lesson_step_status"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_lesson_step_status_user_id_step_id_key" ON "user_lesson_step_status"("user_id", "step_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_milestone_badges_user_id_level_id_key" ON "user_milestone_badges"("user_id", "level_id");

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

-- AddForeignKey
ALTER TABLE "lesson_final_challenges" ADD CONSTRAINT "lesson_final_challenges_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "subject_structure"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_practice_questions" ADD CONSTRAINT "lesson_practice_questions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "subject_structure"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_step_content" ADD CONSTRAINT "lesson_step_content_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "lesson_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_steps" ADD CONSTRAINT "lesson_steps_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "subject_structure"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_subscriptions" ADD CONSTRAINT "parent_subscriptions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_subscriptions" ADD CONSTRAINT "parent_subscriptions_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_parent_subscription_id_fkey" FOREIGN KEY ("parent_subscription_id") REFERENCES "parent_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pupils" ADD CONSTRAINT "pupils_current_year_id_fkey" FOREIGN KEY ("current_year_id") REFERENCES "academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pupils" ADD CONSTRAINT "pupils_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "step_unlock_rules" ADD CONSTRAINT "step_unlock_rules_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "lesson_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subject_structure" ADD CONSTRAINT "subject_structure_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "subject_structure"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subject_structure" ADD CONSTRAINT "subject_structure_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_step_status" ADD CONSTRAINT "fk_user_lesson_step_status_pupil" FOREIGN KEY ("user_id") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_step_status" ADD CONSTRAINT "user_lesson_step_status_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "lesson_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_milestone_badges" ADD CONSTRAINT "user_milestone_badges_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "subject_structure"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_milestone_badges" ADD CONSTRAINT "user_milestone_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

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
