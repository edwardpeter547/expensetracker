-- Add per-user token versioning for immediate access-token invalidation.
ALTER TABLE "user" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Add device-session metadata to refresh tokens.
ALTER TABLE "refresh_token" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "refresh_token" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
