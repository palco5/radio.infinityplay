-- Migration to support larger jingle files
-- Run this in phpMyAdmin on Loopia

ALTER TABLE profiles 
MODIFY COLUMN jingle_url MEDIUMTEXT;

-- MEDIUMTEXT can store up to 16MB of data
-- This will allow base64 encoded jingles up to ~12MB original size
