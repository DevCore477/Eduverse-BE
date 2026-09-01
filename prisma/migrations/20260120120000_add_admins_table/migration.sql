-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "admin_role" AS ENUM ('admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" "admin_role" NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reset_token" TEXT,
    "reset_token_expires" TIMESTAMPTZ(6),
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "admins_email_key" ON "admins"("email");

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "admins_email_idx" ON "admins"("email");

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "admins_reset_token_idx" ON "admins"("reset_token");
