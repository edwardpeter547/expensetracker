-- Make password-reset credentials strictly single-use.
ALTER TABLE "PasswordResetToken" ADD COLUMN "usedAt" TIMESTAMP(3);
