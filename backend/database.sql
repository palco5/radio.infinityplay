-- ============================================
-- InfinityPlay Radio - PostgreSQL Database Schema
-- ============================================
-- Ova skripta kreira bazu podataka BEZ Supabase-a
-- Koristi se sa običnim PostgreSQL serverom

-- ============================================
-- 1. PROFILES TABELA
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  country_code TEXT DEFAULT 'RS',
  
  -- Subscription
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
  
  -- Recommended stations
  recommended_stations TEXT[] DEFAULT '{}',
  
  -- Analytics
  total_listening_minutes INTEGER DEFAULT 0,
  
  -- Admin
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. STATIONS TABELA
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
  
  -- Recommended for
  recommended_for TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. FAVORITES TABELA
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, station_id)
);

-- ============================================
-- 4. LISTENING_SESSIONS TABELA
-- ============================================
CREATE TABLE IF NOT EXISTS listening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. INDEKSI
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_stations_is_active ON stations(is_active);
CREATE INDEX IF NOT EXISTS idx_stations_genre ON stations(genre);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_station_id ON favorites(station_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_user_id ON listening_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_sessions_station_id ON listening_sessions(station_id);

-- ============================================
-- 6. MOCK DATA (Opciono)
-- ============================================
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
