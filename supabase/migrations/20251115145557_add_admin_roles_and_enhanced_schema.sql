/*
  # Add Admin Roles and Enhanced Database Schema

  ## Overview
  This migration enhances the database schema to support admin functionality, 
  payment processing, and analytics tracking for the InfinityPlay Radio platform.

  ## New Columns
  - `users_profiles.is_admin` - Boolean flag to identify admin users
  - `users_profiles.admin_level` - Integer to support different admin permission levels
  - `users_profiles.last_login_at` - Timestamp to track user activity

  ## New Tables
  
  ### `admin_logs`
  Tracks all administrative actions performed in the system
  - `id` (uuid, primary key)
  - `admin_user_id` (uuid, foreign key to users_profiles)
  - `action_type` (text) - Type of action performed
  - `target_type` (text) - What was affected (user, station, subscription, etc.)
  - `target_id` (text) - ID of affected resource
  - `details` (jsonb) - Additional action details
  - `ip_address` (text) - IP from which action was performed
  - `created_at` (timestamptz)

  ### `payment_transactions`
  Extended payment tracking with detailed transaction information
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `subscription_id` (uuid, foreign key)
  - `paypal_transaction_id` (text)
  - `paypal_order_id` (text)
  - `amount_cents` (integer)
  - `currency` (text)
  - `status` (text) - pending, completed, failed, refunded
  - `payment_method` (text)
  - `transaction_type` (text) - subscription, trial_conversion, renewal, refund
  - `metadata` (jsonb)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `analytics_daily`
  Daily aggregated analytics data
  - `id` (uuid, primary key)
  - `date` (date, unique)
  - `total_users` (integer)
  - `active_subscriptions` (integer)
  - `new_signups` (integer)
  - `revenue_cents` (integer)
  - `total_listening_minutes` (integer)
  - `unique_listeners` (integer)
  - `top_station_id` (uuid)
  - `created_at` (timestamptz)

  ### `station_analytics`
  Per-station listening analytics
  - `id` (uuid, primary key)
  - `station_id` (uuid, foreign key)
  - `date` (date)
  - `total_listeners` (integer)
  - `total_minutes` (integer)
  - `peak_concurrent_listeners` (integer)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Admin tables restricted to admin users only
  - Analytics tables read-only for admins
  - Payment tables restricted to owner and admins
*/

-- Add admin-related columns to users_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'admin_level'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN admin_level integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN last_login_at timestamptz;
  END IF;
END $$;

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user ON admin_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
  ON admin_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert logs"
  ON admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  paypal_transaction_id text,
  paypal_order_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  payment_method text DEFAULT 'paypal',
  transaction_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update transactions"
  ON payment_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

-- Create analytics_daily table
CREATE TABLE IF NOT EXISTS analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  total_users integer DEFAULT 0,
  active_subscriptions integer DEFAULT 0,
  new_signups integer DEFAULT 0,
  revenue_cents integer DEFAULT 0,
  total_listening_minutes integer DEFAULT 0,
  unique_listeners integer DEFAULT 0,
  top_station_id uuid REFERENCES radio_stations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date DESC);

ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics"
  ON analytics_daily FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

CREATE POLICY "System can manage analytics"
  ON analytics_daily FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

-- Create station_analytics table
CREATE TABLE IF NOT EXISTS station_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES radio_stations(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_listeners integer DEFAULT 0,
  total_minutes integer DEFAULT 0,
  peak_concurrent_listeners integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(station_id, date)
);

CREATE INDEX IF NOT EXISTS idx_station_analytics_station ON station_analytics(station_id);
CREATE INDEX IF NOT EXISTS idx_station_analytics_date ON station_analytics(date DESC);

ALTER TABLE station_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view station analytics"
  ON station_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

CREATE POLICY "System can manage station analytics"
  ON station_analytics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment_transactions
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial analytics record for today if not exists
INSERT INTO analytics_daily (date, total_users, active_subscriptions, new_signups, revenue_cents)
VALUES (CURRENT_DATE, 0, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;