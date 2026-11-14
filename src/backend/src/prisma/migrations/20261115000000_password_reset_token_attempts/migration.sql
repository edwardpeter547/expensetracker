-- Enforce an attempt limit on password-reset codes so the six-digit OTP
-- cannot be brute-forced through verify-otp or reset-password.
ALTER TABLE "PasswordResetToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
