-- =========================================
-- FIX parents.id AND ALL FK REFERENCES
-- Firebase UID compatibility migration
-- =========================================

-- 1. DROP foreign keys referencing parents.id

ALTER TABLE parent_subscriptions
DROP CONSTRAINT IF EXISTS parent_subscriptions_parent_id_fkey;

ALTER TABLE pupils
DROP CONSTRAINT IF EXISTS pupils_parent_id_fkey;

ALTER TABLE subject_structure
DROP CONSTRAINT IF EXISTS subject_structure_parent_id_fkey;

-- 2. Convert parents.id from UUID → TEXT

ALTER TABLE parents
ALTER COLUMN id TYPE TEXT
USING id::text;

ALTER TABLE parents
ALTER COLUMN id DROP DEFAULT;

-- 3. Convert all parent_id columns to TEXT

ALTER TABLE parent_subscriptions
ALTER COLUMN parent_id TYPE TEXT
USING parent_id::text;

ALTER TABLE pupils
ALTER COLUMN parent_id TYPE TEXT
USING parent_id::text;

ALTER TABLE subject_structure
ALTER COLUMN parent_id TYPE TEXT
USING parent_id::text;

-- 4. Re-create foreign key constraints

ALTER TABLE parent_subscriptions
ADD CONSTRAINT parent_subscriptions_parent_id_fkey
FOREIGN KEY (parent_id)
REFERENCES parents(id)
ON DELETE CASCADE;

ALTER TABLE pupils
ADD CONSTRAINT pupils_parent_id_fkey
FOREIGN KEY (parent_id)
REFERENCES parents(id)
ON DELETE CASCADE;

ALTER TABLE subject_structure
ADD CONSTRAINT subject_structure_parent_id_fkey
FOREIGN KEY (parent_id)
REFERENCES parents(id)
ON DELETE CASCADE;
