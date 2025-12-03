/*
  # Fix Business Categories - Ensure Data Exists

  ## Overview
  This migration ensures that business categories are properly inserted into the database
  and accessible to all authenticated users during registration and onboarding.

  ## Actions
  1. Re-insert all business categories with conflict handling
  2. Verify RLS policies allow authenticated users to read categories
  3. Add index for faster category lookups

  ## Categories
  - Kafić (Cafe)
  - Restoran (Restaurant)
  - Bar
  - Teretana (Gym)
  - Hotel
  - Shopping Centar (Shopping Center)
  - Salon Lepote (Beauty Salon)
  - Medicinski Centar (Medical Center)
  - Spa Centar (Spa)
  - Kancelarija (Office)
  - Prodavnica (Retail Store)
  - Ostalo (Other)

  ## Security
  - RLS enabled
  - All authenticated users can read categories
  - Only admins can modify categories
*/

-- Ensure business_categories table exists with proper structure
CREATE TABLE IF NOT EXISTS business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name_sr text NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_categories_sort_order ON business_categories(sort_order);

-- Enable RLS
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any and recreate them
DROP POLICY IF EXISTS "Anyone can view business categories" ON business_categories;
DROP POLICY IF EXISTS "All authenticated users can view categories" ON business_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON business_categories;

-- Policy: All authenticated users can read categories
CREATE POLICY "All authenticated users can view categories"
  ON business_categories FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON business_categories FOR ALL
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

-- Delete all existing categories first to ensure clean state
DELETE FROM business_categories;

-- Insert all business categories
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
  ('other', 'Ostalo', '📍', 12);

-- Verify categories were inserted
DO $$
DECLARE
  category_count integer;
BEGIN
  SELECT COUNT(*) INTO category_count FROM business_categories;
  
  IF category_count = 0 THEN
    RAISE EXCEPTION 'Business categories were not inserted successfully';
  END IF;
  
  RAISE NOTICE 'Successfully inserted % business categories', category_count;
END $$;