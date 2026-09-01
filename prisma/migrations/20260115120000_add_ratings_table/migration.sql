-- Ensure parents.id is TEXT (Firebase UID) so ratings.parent_id FK is compatible.
-- Skip if already applied by 20251222183000_fix_parents_id_everywhere.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parents' AND column_name = 'id') = 'uuid' THEN
    -- 1. Drop foreign keys referencing parents.id
    ALTER TABLE parent_subscriptions DROP CONSTRAINT IF EXISTS parent_subscriptions_parent_id_fkey;
    ALTER TABLE pupils DROP CONSTRAINT IF EXISTS pupils_parent_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_notifications') THEN
      ALTER TABLE parent_notifications DROP CONSTRAINT IF EXISTS fk_parent_notifications_parent;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
      ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_parent_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_device_tokens') THEN
      ALTER TABLE parent_device_tokens DROP CONSTRAINT IF EXISTS parent_device_tokens_parent_id_fkey;
    END IF;

    -- 2. Convert parents.id from UUID → TEXT
    ALTER TABLE parents ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE parents ALTER COLUMN id DROP DEFAULT;

    -- 3. Convert parent_id columns to TEXT
    ALTER TABLE parent_subscriptions ALTER COLUMN parent_id TYPE TEXT USING parent_id::text;
    ALTER TABLE pupils ALTER COLUMN parent_id TYPE TEXT USING parent_id::text;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_notifications') THEN
      ALTER TABLE parent_notifications ALTER COLUMN parent_id TYPE TEXT USING parent_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
      ALTER TABLE notifications ALTER COLUMN parent_id TYPE TEXT USING parent_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_device_tokens') THEN
      ALTER TABLE parent_device_tokens ALTER COLUMN parent_id TYPE TEXT USING parent_id::text;
    END IF;

    -- 4. Re-create foreign key constraints
    ALTER TABLE parent_subscriptions ADD CONSTRAINT parent_subscriptions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;
    ALTER TABLE pupils ADD CONSTRAINT pupils_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_notifications') THEN
      ALTER TABLE parent_notifications ADD CONSTRAINT fk_parent_notifications_parent FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
      ALTER TABLE notifications ADD CONSTRAINT notifications_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_device_tokens') THEN
      ALTER TABLE parent_device_tokens ADD CONSTRAINT parent_device_tokens_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ratings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ratings_parent_id_idx" ON "ratings"("parent_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ratings_created_at_idx" ON "ratings"("created_at");

-- AddForeignKey (only if not already present, e.g. after re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ratings_parent_id_fkey') THEN
    ALTER TABLE "ratings" ADD CONSTRAINT "ratings_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
