-- Create parent_notifications table for in-app alerts to parents
CREATE TABLE IF NOT EXISTS "parent_notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "parent_id" TEXT NOT NULL,
    "pupil_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "fk_parent_notifications_parent"
        FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "fk_parent_notifications_pupil"
        FOREIGN KEY ("pupil_id") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_parent_notifications_parent_id" ON "parent_notifications"("parent_id");
CREATE INDEX IF NOT EXISTS "idx_parent_notifications_pupil_id" ON "parent_notifications"("pupil_id");

