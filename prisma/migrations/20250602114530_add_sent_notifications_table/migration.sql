-- CreateTable
CREATE TABLE "sent_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pupil_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sent_notifications_pupil_id_lesson_id_key" ON "sent_notifications"("pupil_id", "lesson_id");

