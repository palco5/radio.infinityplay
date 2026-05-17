-- Fix trial subscription end dates
-- This updates all users in trial status to have subscription_ends_at = trial_ends_at
-- Run this on your Loopia database

UPDATE profiles 
SET subscription_ends_at = trial_ends_at
WHERE subscription_status = 'trial' 
  AND trial_ends_at IS NOT NULL;

-- Verify the changes
SELECT 
    id,
    email,
    subscription_status,
    subscription_tier,
    trial_started_at,
    trial_ends_at,
    subscription_ends_at,
    DATEDIFF(trial_ends_at, NOW()) as days_until_trial_ends,
    DATEDIFF(subscription_ends_at, NOW()) as days_until_subscription_ends
FROM profiles 
WHERE subscription_status = 'trial';
