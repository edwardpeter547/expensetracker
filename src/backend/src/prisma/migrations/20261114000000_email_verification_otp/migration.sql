-- Replace the legacy hexadecimal verification-link tokens with single-use,
-- attempt-limited, hashed six-digit verification codes.
--
-- Outstanding legacy hex tokens cannot be mapped to the new numeric-code
-- contract, so they are removed here and their users must request a fresh
-- code through the resend endpoint. This avoids leaving a second verification
-- path that would bypass the new attempt and expiry controls.

DELETE FROM "VerificationToken";

DROP INDEX "VerificationToken_token_key";

ALTER TABLE "VerificationToken" RENAME COLUMN "token" TO "tokenHash";
ALTER TABLE "VerificationToken" ADD COLUMN "usedAt" TIMESTAMP(3);
ALTER TABLE "VerificationToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "VerificationToken_userId_tokenHash_idx"
    ON "VerificationToken"("userId", "tokenHash");
