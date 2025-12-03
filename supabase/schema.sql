-- InfinityPlay Radio - Supabase Database Schema
-- Ova skripta kreira sve potrebne tabele i funkcije za InfinityPlay Radio platformu

-- ============================================
-- 1. PROFILES TABELA (Korisnički profili)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  country_code TEXT DEFAULT 'RS',
  
  -- Subscription polja
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  selected_plan_id TEXT,
  
  -- Preferences
  theme_preference TEXT DEFAULT 'dark',
  email_notifications BOOLEAN DEFAULT TRUE,
  newsletter_subscribed BOOLEAN DEFAULT FALSE,
  
  -- Business info
  business_category TEXT,
  custom_location TEXT,
  
  -- Trial & UI
  onboarding_completed BOOLEAN DEFAULT FALSE,
  confetti_shown BOOLEAN DEFAULT FALSE,
  trial_ui_config JSONB,
  
  -- Jingle settings
  jingle_url TEXT,
  jingle_interval_minutes INTEGER DEFAULT 7,
  
  -- Recommended stations (array of station IDs)
  recommended_stations TEXT[] DEFAULT '{}',
  
  -- Analytics
  total_listening_minutes INTEGER DEFAULT 0,
  
  -- Admin
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies za profiles
CREATE POLICY "Korisnici mogu videti svoje profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Korisnici mogu ažurirati svoje profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admini mogu videti sve profile"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admini mogu ažurirati sve profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ============================================
-- 2. STATIONS TABELA (Radio stanice)
-- ============================================
CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  logo_url TEXT,
  stream_url TEXT NOT NULL,
  medicp_id TEXT,
  bitrate INTEGER DEFAULT 128,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  listener_count INTEGER DEFAULT 0,
  
  -- Styling
  icon_url TEXT,
  icon_emoji TEXT,
  background_url TEXT,
  background_color TEXT,
  background_type TEXT DEFAULT 'solid',
  
  -- Grid positioning
  grid_row INTEGER,
  grid_column INTEGER,
  grid_page INTEGER DEFAULT 1,
  
  -- Recommended for (array of business categories)
  recommended_for TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

-- Policies za stations
CREATE POLICY "Svi mogu videti aktivne stanice"
  ON stations FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admini mogu videti sve stanice"
  ON stations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admini mogu kreirati stanice"
  ON stations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admini mogu ažurirati stanice"
  ON stations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admini mogu brisati stanice"
  ON stations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ============================================
-- 3. FAVORITES TABELA (Omiljene stanice)
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, station_id)
);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policies za favorites
CREATE POLICY "Korisnici mogu videti svoje favorite"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Korisnici mogu dodavati favorite"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Korisnici mogu brisati svoje favorite"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. LISTENING_SESSIONS TABELA (Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS listening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE listening_sessions ENABLE ROW LEVEL SECURITY;

-- Policies za listening_sessions
CREATE POLICY "Korisnici mogu videti svoje sesije"
  ON listening_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Korisnici mogu kreirati sesije"
  ON listening_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admini mogu videti sve sesije"
  ON listening_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ============================================
-- 5. FUNKCIJE I TRIGERI
-- ============================================

-- Funkcija za automatsko ažuriranje updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger za profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger za stations
DROP TRIGGER IF EXISTS update_stations_updated_at ON stations;
CREATE TRIGGER update_stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funkcija za kreiranje profila nakon registracije
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger za automatsko kreiranje profila
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. INDEKSI ZA PERFORMANSE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_stations_is_active ON stations(is_active);
CREATE INDEX IF NOT EXISTS idx_stations_genre ON stations(genre);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_station_id ON favorites(station_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_user_id ON listening_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_station_id ON listening_sessions(station_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_created_at ON listening_sessions(created_at);

-- ============================================
-- 7. MOCK DATA (Opciono - za testiranje)
-- ============================================

-- Dodaj mock stanice (samo ako ne postoje)
INSERT INTO stations (name, description, genre, logo_url, stream_url, icon_emoji, background_color, recommended_for, is_active)
VALUES
  ('Infinity Chill', 'Opuštajuća muzika za relaksaciju', 'Chill', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', 'https://stream.zeno.fm/f3wvbbqmdg8uv', '🎵', '#10b981', ARRAY['Restoran', 'Kafić', 'Hotel'], TRUE),
  ('Infinity Rock', 'Najbolji rock hitovi', 'Rock', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400', 'https://stream.zeno.fm/8wv4d8g4d48uv', '🎸', '#ef4444', ARRAY['Bar', 'Teretana', 'Prodavnica'], TRUE),
  ('Infinity Pop', 'Popularni hitovi', 'Pop', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', 'https://stream.zeno.fm/0r0xa792kwzuv', '🎤', '#ec4899', ARRAY['Prodavnica', 'Salon lepote', 'Kafić'], TRUE),
  ('Infinity Jazz', 'Smooth jazz za svaku priliku', 'Jazz', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 'https://stream.zeno.fm/f7wvbbqmdg8uv', '🎷', '#8b5cf6', ARRAY['Restoran', 'Hotel', 'Lounge bar'], TRUE),
  ('Infinity Electronic', 'Elektronska muzika i EDM', 'Electronic', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'https://stream.zeno.fm/h5wvbbqmdg8uv', '⚡', '#3b82f6', ARRAY['Noćni klub', 'Teretana', 'Bar'], TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- GOTOVO! 🎉
-- ============================================
-- Sada možeš pokrenuti ovu skriptu u Supabase SQL Editor-u
-- Nakon toga, aplikacija će raditi sa pravom bazom podataka
