-- Invalidate legacy plaintext refresh tokens. Existing rows stored raw token
-- values and can no longer be matched once lookups switch to SHA-256 hashes,
-- so the safest migration is to drop them and force a re-login.
DELETE FROM "refresh_token";

-- Add token-family grouping used for reuse detection and family revocation.
ALTER TABLE "refresh_token" ADD COLUMN "family_id" TEXT NOT NULL;

CREATE INDEX "refresh_token_family_id_idx" ON "refresh_token"("family_id");
