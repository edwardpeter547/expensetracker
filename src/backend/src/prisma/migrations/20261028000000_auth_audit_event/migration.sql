-- Persistent, secret-safe authentication audit trail.
--
-- The nullable `userId` column (with ON DELETE SET NULL) represents
-- unsuccessful attempts against unknown accounts and keeps account deletion
-- independent of the audit store. `metadata` holds only allowlisted,
-- non-sensitive values enforced by the audit service.

-- CreateTable
CREATE TABLE "auth_audit_event" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "userId" INTEGER,
    "ipAddress" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_audit_event_userId_createdAt_idx" ON "auth_audit_event"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "auth_audit_event_eventType_createdAt_idx" ON "auth_audit_event"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "auth_audit_event_createdAt_idx" ON "auth_audit_event"("createdAt");

-- AddForeignKey
ALTER TABLE "auth_audit_event" ADD CONSTRAINT "auth_audit_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
