-- Add 'god' tier to subscription_tier check constraint
-- This allows users to have unlimited stores and keywords with customizable limits

-- Drop the existing check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

-- Add new check constraint that includes 'god' tier
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check 
  CHECK (subscription_tier IN ('free', 'basic', 'pro', 'god'));

-- Add comment explaining god tier
COMMENT ON COLUMN profiles.subscription_tier IS 
  'Subscription tier: free (1 store, 1 keyword), basic (3 stores, 10 keywords), pro (10 stores, 50 keywords), god (unlimited - customizable)';
