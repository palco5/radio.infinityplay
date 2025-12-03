/*
  # Add Business Categories and Enhanced User Tracking

  ## Overview
  This migration adds business category tracking for users, enhances trial period tracking,
  and creates additional tables for comprehensive admin functionality.

  ## New Columns
  - `users_profiles.business_category` - Category of business (Kafic, Restoran, Bar, etc.)
  - `users_profiles.selected_plan_id` - Stores the initially selected plan during registration
  - `users_profiles.onboarding_completed` - Tracks if user completed onboarding

  ## New Tables
  
  ### `business_categories`
  Predefined list of business categories
  - `id` (uuid, primary key)
  - `name` (text, unique)
  - `display_name_sr` (text) - Serbian display name
  - `icon` (text) - Icon identifier
  - `created_at` (timestamptz)

  ### `listening_sessions`
  Tracks individual listening sessions for analytics
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `station_id` (uuid, foreign key)
  - `started_at` (timestamptz)
  - `ended_at` (timestamptz)
  - `duration_seconds` (integer)
  - `created_at` (timestamptz)

  ### `admin_permissions`
  Granular admin permission management
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `permission_type` (text) - manage_users, manage_stations, view_analytics, manage_payments, system_settings
  - `granted_by` (uuid, foreign key)
  - `granted_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Business categories readable by authenticated users
  - Listening sessions only accessible to owner and admins
  - Admin permissions only visible to admins
*/

-- Add business category columns to users_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'business_category'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN business_category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'selected_plan_id'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN selected_plan_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create business_categories table
CREATE TABLE IF NOT EXISTS business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name_sr text NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business categories"
  ON business_categories FOR SELECT
  TO authenticated
  USING (true);

-- Insert predefined business categories
INSERT INTO business_categories (name, display_name_sr, icon, sort_order) VALUES
  ('cafe', 'Kafić', '☕', 1),
  ('restaurant', 'Restoran', '🍽️', 2),
  ('bar', 'Bar', '🍸', 3),
  ('gym', 'Teretana', '💪', 4),
  ('hotel', 'Hotel', '🏨', 5),
  ('shopping_center', 'Shopping Centar', '🛍️', 6),
  ('beauty_salon', 'Salon Lepote', '💅', 7),
  ('medical_center', 'Medicinski Centar', '🏥', 8),
  ('spa', 'Spa Centar', '🧖', 9),
  ('office', 'Kancelarija', '🏢', 10),
  ('retail_store', 'Prodavnica', '🏪', 11),
  ('other', 'Ostalo', '📍', 12)
ON CONFLICT (name) DO NOTHING;

-- Create listening_sessions table
CREATE TABLE IF NOT EXISTS listening_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES radio_stations(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listening_sessions_user ON listening_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_station ON listening_sessions(station_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_started_at ON listening_sessions(started_at DESC);

ALTER TABLE listening_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listening sessions"
  ON listening_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all listening sessions"
  ON listening_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert own listening sessions"
  ON listening_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listening sessions"
  ON listening_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  permission_type text NOT NULL,
  granted_by uuid REFERENCES users_profiles(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_type)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id);

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all permissions"
  ON admin_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage permissions"
  ON admin_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

-- Grant all permissions to the main admin
INSERT INTO admin_permissions (user_id, permission_type, granted_at)
SELECT id, permission_type, now()
FROM users_profiles, unnest(ARRAY['manage_users', 'manage_stations', 'view_analytics', 'manage_payments', 'system_settings']) AS permission_type
WHERE email = 'darkospira@gmail.com' AND is_admin = true
ON CONFLICT (user_id, permission_type) DO NOTHING;
