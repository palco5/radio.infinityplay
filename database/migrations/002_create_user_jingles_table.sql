-- Migration: Create user_jingles table for multiple jingle support
-- Run this in phpMyAdmin on Loopia after running 001_increase_jingle_url_size.sql

CREATE TABLE IF NOT EXISTS user_jingles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  jingle_name VARCHAR(255) NOT NULL,
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id VARCHAR(255),
  duration_seconds DECIMAL(5,2),
  file_size_bytes INT,
  
  -- Scheduling
  play_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  schedule_type VARCHAR(50) DEFAULT 'interval',
  
  -- Interval-based (minutes)
  interval_minutes INT DEFAULT 7,
  
  -- Song-based (after X songs)
  after_songs_count INT,
  
  -- Time-based (hour ranges)
  time_start TIME,
  time_end TIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_play_order (play_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
