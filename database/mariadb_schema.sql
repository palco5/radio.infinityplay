-- ============================================
-- InfinityPlay Radio - MariaDB Database Schema
-- ============================================
-- Za Loopia Hosting sa MariaDB bazom

-- ============================================
-- 1. PROFILES TABELA (Korisnici)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  country_code VARCHAR(10) DEFAULT 'RS',
  
  -- Subscription
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_ends_at DATETIME,
  trial_ends_at DATETIME,
  trial_started_at DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  selected_plan_id VARCHAR(100),

  -- Billing provider (kartica: Polar)
  provider_customer_id VARCHAR(64),
  provider_subscription_id VARCHAR(64),
  
  -- Preferences
  theme_preference VARCHAR(20) DEFAULT 'dark',
  email_notifications BOOLEAN DEFAULT TRUE,
  newsletter_subscribed BOOLEAN DEFAULT FALSE,
  
  -- Business info
  business_category VARCHAR(100),
  custom_location VARCHAR(255),
  venue_name VARCHAR(255),
  
  -- Trial & UI
  onboarding_completed BOOLEAN DEFAULT FALSE,
  confetti_shown BOOLEAN DEFAULT FALSE,
  trial_ui_config JSON,
  
  -- Jingle settings
  jingle_url TEXT,
  jingle_interval_minutes INT DEFAULT 7,
  my_radio_stream_url TEXT NULL,
  
  -- Recommended stations (stored as JSON array)
  recommended_stations JSON,
  
  -- Analytics
  total_listening_minutes INT DEFAULT 0,
  
  -- Admin
  is_admin BOOLEAN DEFAULT FALSE,

  -- Email verification (blocking): 0 = not verified, 1 = verified
  email_verified TINYINT NOT NULL DEFAULT 0,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_is_admin (is_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL_CODES TABELA (PIN za verifikaciju emaila i reset lozinke)
-- ============================================
CREATE TABLE IF NOT EXISTS email_codes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,            -- bcrypt hash of the 6-digit PIN
  purpose VARCHAR(32) NOT NULL,               -- 'verify_email' | 'password_reset'
  attempts INT NOT NULL DEFAULT 0,            -- wrong tries; locks at 5
  used TINYINT NOT NULL DEFAULT 0,            -- 1 once consumed/invalidated
  expires_at DATETIME NOT NULL,               -- typically now + 15 min
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. STATIONS TABELA (Radio stanice)
-- ============================================
CREATE TABLE IF NOT EXISTS stations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  logo_url TEXT,
  stream_url TEXT NOT NULL,
  medicp_id VARCHAR(100),
  bitrate INT DEFAULT 128,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  listener_count INT DEFAULT 0,
  
  -- Styling
  icon_url TEXT,
  icon_emoji VARCHAR(10),
  background_url TEXT,
  background_color VARCHAR(20),
  background_type VARCHAR(20) DEFAULT 'solid',
  
  -- Grid positioning
  grid_row INT,
  grid_column INT,
  grid_page INT DEFAULT 1,
  
  -- Recommended for (stored as JSON array)
  recommended_for JSON,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_is_active (is_active),
  INDEX idx_genre (genre),
  INDEX idx_grid (grid_page, grid_row, grid_column)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. FAVORITES TABELA (Omiljene stanice)
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  station_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_favorite (user_id, station_id),
  INDEX idx_user_id (user_id),
  INDEX idx_station_id (station_id),
  
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3b. USER_BLACKLIST TABELA (per-user blocked songs / artists)
-- ============================================
-- A blacklist entry blocks either a whole artist (block_type='artist', title
-- NULL) or a single song (block_type='song', artist + title). Enforcement is
-- per-user and client-side: a shared live stream can't be filtered at the
-- source for one listener, so the player mutes blocked tracks locally.
CREATE TABLE IF NOT EXISTS user_blacklist (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  block_type VARCHAR(10) NOT NULL,
  artist VARCHAR(255) NOT NULL DEFAULT '',
  title VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user (user_id),

  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. LISTENING_SESSIONS TABELA (Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS listening_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  station_id VARCHAR(36) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_station_id (station_id),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. MOCK DATA (Početne radio stanice)
-- ============================================
INSERT INTO stations (id, name, description, genre, logo_url, stream_url, icon_emoji, background_color, recommended_for, is_active)
VALUES
  (UUID(), 'Infinity Chill', 'Opuštajuća muzika za relaksaciju', 'Chill', 
   'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', 
   'https://stream.zeno.fm/f3wvbbqmdg8uv', '🎵', '#10b981', 
   JSON_ARRAY('Restoran', 'Kafić', 'Hotel'), TRUE),
   
  (UUID(), 'Infinity Rock', 'Najbolji rock hitovi', 'Rock', 
   'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400', 
   'https://stream.zeno.fm/8wv4d8g4d48uv', '🎸', '#ef4444', 
   JSON_ARRAY('Bar', 'Teretana', 'Prodavnica'), TRUE),
   
  (UUID(), 'Infinity Pop', 'Popularni hitovi', 'Pop', 
   'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', 
   'https://stream.zeno.fm/0r0xa792kwzuv', '🎤', '#ec4899', 
   JSON_ARRAY('Prodavnica', 'Salon lepote', 'Kafić'), TRUE),
   
  (UUID(), 'Infinity Jazz', 'Smooth jazz za svaku priliku', 'Jazz', 
   'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 
   'https://stream.zeno.fm/f7wvbbqmdg8uv', '🎷', '#8b5cf6', 
   JSON_ARRAY('Restoran', 'Hotel', 'Lounge bar'), TRUE),
   
  (UUID(), 'Infinity Electronic', 'Elektronska muzika i EDM', 'Electronic', 
   'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 
   'https://stream.zeno.fm/h5wvbbqmdg8uv', '⚡', '#3b82f6', 
   JSON_ARRAY('Noćni klub', 'Teretana', 'Bar'), TRUE);

-- ============================================
-- 7. REMOTE SESSIONS TABELA (Daljinski upravljač)
-- ============================================
CREATE TABLE IF NOT EXISTS remote_sessions (
  device_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  device_type VARCHAR(20) DEFAULT 'desktop',
  device_name VARCHAR(100) DEFAULT 'Uređaj',
  station_id VARCHAR(36) NULL,
  station_name VARCHAR(200) NULL,
  is_playing TINYINT(1) DEFAULT 0,
  pending_command VARCHAR(300) NULL,
  command_id VARCHAR(36) NULL,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- GOTOVO! 🎉
-- ============================================
-- Kopiraj i pokreni ovu skriptu u phpMyAdmin-u na Loopia hosting-u

-- ============================================
-- MIGRACIJE (pokrenuti ako baza već postoji)
-- ============================================
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS venue_name VARCHAR(255) AFTER custom_location;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(64);
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(64);
