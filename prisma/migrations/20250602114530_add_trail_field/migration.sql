-- CreateEnum
CREATE TYPE "trial_status" AS ENUM ('not_started', 'active', 'expired', 'converted');

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "max_pupils_allowed" INTEGER DEFAULT 1,
ADD COLUMN     "trial_end_date" TIMESTAMPTZ(6),
ADD COLUMN     "trial_period_days" INTEGER DEFAULT 7,
ADD COLUMN     "trial_start_date" TIMESTAMPTZ(6),
ADD COLUMN     "trial_status" "trial_status" DEFAULT 'not_started';

