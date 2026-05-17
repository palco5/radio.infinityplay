-- Migration: Add Base64 jingle storage support
-- Run this in phpMyAdmin on Loopia

-- Add jingle_data column for Base64 storage
ALTER TABLE user_jingles 
ADD COLUMN jingle_data LONGTEXT AFTER cloudinary_url,
ADD COLUMN storage_type VARCHAR(20) DEFAULT 'cloudinary' AFTER jingle_data;

-- Update existing records to mark as cloudinary storage
UPDATE user_jingles SET storage_type = 'cloudinary' WHERE cloudinary_url IS NOT NULL;

-- Make cloudinary_url nullable since we now support Base64
ALTER TABLE user_jingles 
MODIFY COLUMN cloudinary_url TEXT NULL;
