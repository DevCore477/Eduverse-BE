-- Add password_hash column for local JWT authentication
ALTER TABLE "parents" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;


