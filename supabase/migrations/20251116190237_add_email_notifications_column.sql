/*
  # Add Email Notifications Column

  ## Overview
  Adds the email_notifications column to users_profiles table for user notification preferences.

  ## New Column Added to `users_profiles`
  - `email_notifications` (boolean, DEFAULT true) - User's preference for email notifications

  ## Security
  - Users can update their own email_notifications preference
  - RLS policies remain unchanged
*/

-- Add email_notifications column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'email_notifications'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN email_notifications boolean DEFAULT true;
  END IF;
END $$;
