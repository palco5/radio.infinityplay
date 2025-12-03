/*
  # Add User Contact Information Fields

  ## Overview
  This migration adds phone number, country code, first name, and last name fields
  to the users_profiles table to enhance user registration and profile management.

  ## New Columns Added to `users_profiles`
  - `first_name` (text, NOT NULL) - User's first name
  - `last_name` (text, NOT NULL) - User's last name
  - `phone_number` (text, NOT NULL) - User's phone number
  - `country_code` (text, DEFAULT '+381') - Country calling code

  ## Important Notes
  1. All new fields are required for new registrations
  2. Existing users will have NULL values that should be updated during their next login
  3. Country code defaults to +381 (Serbia)
  4. Business category selection is now exclusively handled in onboarding, not during registration

  ## Security
  - Users can update their own contact information
  - Admins can view all user contact information
  - RLS policies remain unchanged for users_profiles table
*/

-- Add contact information columns to users_profiles
DO $$
BEGIN
  -- Add first_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN first_name text;
  END IF;

  -- Add last_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN last_name text;
  END IF;

  -- Add phone_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN phone_number text;
  END IF;

  -- Add country_code column with default value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN country_code text DEFAULT '+381';
  END IF;
END $$;

-- Add index for phone number lookups (useful for admin searches)
CREATE INDEX IF NOT EXISTS idx_users_profiles_phone_number ON users_profiles(phone_number);

-- Add index for name searches
CREATE INDEX IF NOT EXISTS idx_users_profiles_first_name ON users_profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_users_profiles_last_name ON users_profiles(last_name);
