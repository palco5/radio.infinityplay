-- Migration 005: Add my_radio_stream_url to profiles
-- Run this in phpMyAdmin on Loopia hosting

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS my_radio_stream_url TEXT NULL
  AFTER jingle_interval_minutes;
