-- =========================
-- ADD MFA SUPPORT
-- Migration: 20250924_add_mfa_support.sql
-- Purpose: Add TOTP secret storage and backup codes for MFA
-- =========================

-- Add TOTP secret and backup codes to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ DEFAULT now();

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_totp_secret ON profiles(totp_secret) WHERE totp_secret IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_two_factor_enabled ON profiles(two_factor_enabled) WHERE two_factor_enabled = true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.totp_secret IS 'Encrypted TOTP secret for two-factor authentication';
COMMENT ON COLUMN profiles.totp_backup_codes IS 'Array of backup codes for TOTP recovery';
COMMENT ON COLUMN profiles.totp_enabled_at IS 'Timestamp when TOTP was first enabled';
COMMENT ON COLUMN profiles.last_password_change IS 'Timestamp of last password change';

-- Create table for password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Secure password reset tokens with expiration';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration timestamp (24 hours)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (null if unused)';

-- Create table for MFA login attempts tracking
CREATE TABLE IF NOT EXISTS mfa_attempts (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('totp', 'backup_code')),
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient lookups and rate limiting
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_id_created_at ON mfa_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_ip_created_at ON mfa_attempts(ip_address, created_at);

-- Add comments for documentation
COMMENT ON TABLE mfa_attempts IS 'Track MFA authentication attempts for security monitoring';
COMMENT ON COLUMN mfa_attempts.attempt_type IS 'Type of MFA attempt: totp or backup_code';
