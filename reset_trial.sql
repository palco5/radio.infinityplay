-- RESET TRIAL FOR SPECIFIC USER (zameni 'vas-email@example.com' sa pravim emailom)
UPDATE profiles 
SET 
    subscription_status = 'free',
    subscription_tier = 'free',
    trial_started_at = NULL,
    trial_ends_at = NULL,
    subscription_ends_at = NULL,
    cancel_at_period_end = 0
WHERE email = 'vas-email@example.com';

-- ILI resetuj SVE trial korisnike
UPDATE profiles 
SET 
    subscription_status = 'free',
    subscription_tier = 'free',
    trial_started_at = NULL,
    trial_ends_at = NULL,
    subscription_ends_at = NULL,
    cancel_at_period_end = 0
WHERE subscription_status = 'trial';
