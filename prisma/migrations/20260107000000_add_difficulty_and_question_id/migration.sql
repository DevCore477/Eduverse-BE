-- CreateEnum for difficulty levels
CREATE TYPE "enum_difficulty" AS ENUM ('easy', 'medium', 'hard');

-- Add difficulty column to lesson_practice_questions
ALTER TABLE "lesson_practice_questions" ADD COLUMN "difficulty" "enum_difficulty" DEFAULT 'medium';

-- Add difficulty and question_id columns to lesson_final_challenges
ALTER TABLE "lesson_final_challenges" ADD COLUMN "difficulty" "enum_difficulty" DEFAULT 'medium';
ALTER TABLE "lesson_final_challenges" ADD COLUMN "question_id" INTEGER;
ALTER TABLE "lesson_final_challenges" ADD COLUMN "order_index" INTEGER;

-- Create index for question_id
CREATE INDEX "idx_final_challenges_question_id" ON "lesson_final_challenges"("question_id");

