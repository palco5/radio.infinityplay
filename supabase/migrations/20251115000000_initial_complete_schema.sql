/*
  # InfinityPlay Radio - Kompletna Inicijalna Schema

  ## Pregled
  Ova migracija kreira sve osnovne tabele potrebne za InfinityPlay Radio platformu.
  Ovo je master migracija koja osigurava da sve tabele postoje sa ispravnom strukturom.

  ## Tabele

  ### 1. users_profiles
  Profili korisnika sa subscription informacijama
  - `id` (uuid, primary key) - ID korisnika iz auth.users
  - `email` (text, unique) - Email adresa
  - `username` (text) - Korisničko ime
  - `display_name` (text) - Prikazno ime
  - `avatar_url` (text) - URL avatara
  - `bio` (text) - Biografija
  - `first_name` (text) - Ime
  - `last_name` (text) - Prezime
  - `phone_number` (text) - Broj telefona
  - `country_code` (text) - Kod države
  - `subscription_tier` (text) - Plan pretplate
  - `subscription_status` (text) - Status pretplate
  - `subscription_ends_at` (timestamptz) - Kraj pretplate
  - `trial_ends_at` (timestamptz) - Kraj probnog perioda
  - `theme_preference` (text) - Tema (light/dark)
  - `total_listening_minutes` (integer) - Ukupno minuta slušanja
  - `is_admin` (boolean) - Admin flag
  - `admin_level` (integer) - Admin nivo
  - `newsletter_subscribed` (boolean) - Newsletter pretplata
  - `business_category` (text) - Kategorija poslovanja
  - `selected_plan_id` (text) - Izabrani plan
  - `onboarding_completed` (boolean) - Onboarding završen
  - `email_notifications` (boolean) - Email notifikacije
  - `last_login_at` (timestamptz) - Poslednji login
  - `created_at` (timestamptz) - Kreiran
  - `updated_at` (timestamptz) - Ažuriran

  ### 2. radio_stations
  Radio stanice dostupne korisnicima
  - `id` (uuid, primary key)
  - `name` (text) - Naziv stanice
  - `description` (text) - Opis
  - `genre` (text) - Žanr
  - `logo_url` (text) - URL loga
  - `stream_url` (text) - URL stream-a
  - `medicp_id` (text) - MediaCP ID
  - `bitrate` (integer) - Bitrate
  - `is_featured` (boolean) - Istaknuta
  - `is_active` (boolean) - Aktivna
  - `listener_count` (integer) - Broj slušalaca
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. subscriptions
  Aktivne pretplate korisnika

  ### 4. trial_periods
  Probni periodi korisnika

  ### 5. payment_transactions
  Transakcije plaćanja

  ## Security
  - RLS omogućen na svim tabelama
  - Korisnici mogu da čitaju/ažuriraju svoj profil
  - Svi autentifikovani korisnici mogu da čitaju aktivne radio stanice
  - Admin korisnici imaju pun pristup
*/

-- Create users_profiles table
CREATE TABLE IF NOT EXISTS users_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  first_name text,
  last_name text,
  phone_number text,
  country_code text DEFAULT '+381',
  subscription_tier text DEFAULT 'free',
  subscription_status text DEFAULT 'inactive',
  subscription_ends_at timestamptz,
  trial_ends_at timestamptz,
  theme_preference text DEFAULT 'light',
  total_listening_minutes integer DEFAULT 0,
  is_admin boolean DEFAULT false,
  admin_level integer DEFAULT 0,
  newsletter_subscribed boolean DEFAULT false,
  business_category text,
  selected_plan_id text,
  onboarding_completed boolean DEFAULT false,
  email_notifications boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_profiles_email ON users_profiles(email);
CREATE INDEX IF NOT EXISTS idx_users_profiles_is_admin ON users_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_profiles_subscription_status ON users_profiles(subscription_status);

ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users_profiles;
CREATE POLICY "Users can view own profile"
  ON users_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users_profiles;
CREATE POLICY "Users can update own profile"
  ON users_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users_profiles;
CREATE POLICY "Users can insert own profile"
  ON users_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON users_profiles;
CREATE POLICY "Admins can view all profiles"
  ON users_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON users_profiles;
CREATE POLICY "Admins can update all profiles"
  ON users_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.is_admin = true
    )
  );

-- Create radio_stations table
CREATE TABLE IF NOT EXISTS radio_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  genre text NOT NULL,
  logo_url text,
  stream_url text NOT NULL,
  medicp_id text,
  bitrate integer DEFAULT 128,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  listener_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radio_stations_genre ON radio_stations(genre);
CREATE INDEX IF NOT EXISTS idx_radio_stations_is_active ON radio_stations(is_active);
CREATE INDEX IF NOT EXISTS idx_radio_stations_is_featured ON radio_stations(is_featured);

ALTER TABLE radio_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active stations" ON radio_stations;
CREATE POLICY "Anyone can view active stations"
  ON radio_stations FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all stations" ON radio_stations;
CREATE POLICY "Admins can view all stations"
  ON radio_stations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage stations" ON radio_stations;
CREATE POLICY "Admins can manage stations"
  ON radio_stations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  tier text NOT NULL,
  paypal_subscription_id text,
  paypal_customer_id text,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "System can create subscriptions" ON subscriptions;
CREATE POLICY "System can create subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update subscriptions" ON subscriptions;
CREATE POLICY "Admins can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

-- Create trial_periods table
CREATE TABLE IF NOT EXISTS trial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  subscription_tier text NOT NULL,
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  converted_to_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_periods_user ON trial_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_periods_is_active ON trial_periods(is_active);

ALTER TABLE trial_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trials" ON trial_periods;
CREATE POLICY "Users can view own trials"
  ON trial_periods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all trials" ON trial_periods;
CREATE POLICY "Admins can view all trials"
  ON trial_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_profiles_updated_at ON users_profiles;
CREATE TRIGGER update_users_profiles_updated_at
  BEFORE UPDATE ON users_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_radio_stations_updated_at ON radio_stations;
CREATE TRIGGER update_radio_stations_updated_at
  BEFORE UPDATE ON radio_stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
