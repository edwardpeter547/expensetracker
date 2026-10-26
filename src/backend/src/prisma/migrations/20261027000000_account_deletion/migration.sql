-- Account deletion requests survive deletion of the user row, so the request
-- table deliberately has no user foreign key. Per-category progress lives in
-- deletion_step and is tied only to the surviving request record.

-- CreateEnum
CREATE TYPE "DeletionRequestType" AS ENUM ('VOLUNTARY', 'STATUTORY');

-- CreateEnum
CREATE TYPE "DeletionScope" AS ENUM ('ALL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING_DELETION', 'DELETION_IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "DeletionStepStatus" AS ENUM ('PENDING', 'COMPLETED', 'RETAINED', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "account_deletion_request" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestType" "DeletionRequestType" NOT NULL,
    "scope" "DeletionScope" NOT NULL DEFAULT 'ALL',
    "status" "DeletionRequestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "recoveryDeadline" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "policyVersion" INTEGER NOT NULL DEFAULT 1,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "context" JSONB,

    CONSTRAINT "account_deletion_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_step" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "DeletionStepStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "retentionReason" TEXT,
    "retentionReviewedBy" TEXT,
    "retentionReviewedAt" TIMESTAMP(3),
    "retentionReviewDue" TIMESTAMP(3),

    CONSTRAINT "deletion_step_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deletion_step_requestId_category_key" ON "deletion_step"("requestId", "category");

-- CreateIndex
CREATE INDEX "deletion_step_requestId_idx" ON "deletion_step"("requestId");

-- CreateIndex
CREATE INDEX "account_deletion_request_userId_idx" ON "account_deletion_request"("userId");

-- CreateIndex
CREATE INDEX "account_deletion_request_status_scheduledFor_idx" ON "account_deletion_request"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "account_deletion_request_status_nextRetryAt_idx" ON "account_deletion_request"("status", "nextRetryAt");

-- Enforce one active (pending or in-progress) deletion request per user at the
-- database level so concurrent closure requests cannot duplicate each other.
CREATE UNIQUE INDEX "account_deletion_request_active_user_key"
    ON "account_deletion_request"("userId")
    WHERE "status" IN ('PENDING_DELETION', 'DELETION_IN_PROGRESS');

-- AddForeignKey
ALTER TABLE "deletion_step" ADD CONSTRAINT "deletion_step_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "account_deletion_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
