-- CreateEnum
CREATE TYPE "manual_payment_request_type" AS ENUM ('upgrade', 'renew');

-- CreateEnum
CREATE TYPE "manual_payment_request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "manual_payment_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" TEXT NOT NULL,
    "subscription_plan_id" UUID NOT NULL,
    "request_type" "manual_payment_request_type" NOT NULL DEFAULT 'upgrade',
    "status" "manual_payment_request_status" NOT NULL DEFAULT 'pending',
    "screenshot_base64" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'USD',
    "note" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manual_payment_requests_parent_id_idx" ON "manual_payment_requests"("parent_id");

-- CreateIndex
CREATE INDEX "manual_payment_requests_status_idx" ON "manual_payment_requests"("status");

-- CreateIndex
CREATE INDEX "manual_payment_requests_created_at_idx" ON "manual_payment_requests"("created_at");

-- AddForeignKey
ALTER TABLE "manual_payment_requests" ADD CONSTRAINT "manual_payment_requests_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "manual_payment_requests" ADD CONSTRAINT "manual_payment_requests_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
