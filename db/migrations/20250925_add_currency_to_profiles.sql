-- Migration: Add currency column to profiles table
-- Date: 2025-09-25
-- Description: Add user's preferred currency to profiles table for localized pricing

-- Add currency column to profiles table
ALTER TABLE profiles 
ADD COLUMN currency text DEFAULT 'MYR' CHECK (currency IN ('MYR', 'USD', 'EUR', 'GBP', 'SGD', 'JPY', 'CNY', 'THB', 'IDR', 'VND'));

-- Add comment to explain the field
COMMENT ON COLUMN profiles.currency IS 'User preferred currency for displaying prices and transactions';

-- Update existing users to have MYR as default currency
UPDATE profiles SET currency = 'MYR' WHERE currency IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_currency ON profiles(currency);
