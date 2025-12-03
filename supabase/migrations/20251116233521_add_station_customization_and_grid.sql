/*
  # Add Station Visual Customization and Grid Positioning

  ## Overview
  This migration adds extensive customization options for radio stations including:
  - Custom icon uploads and emoji selection
  - Custom background images and colors
  - Grid positioning system (4 columns x 5 rows per page)
  - Confetti flag for first-time subscription celebration

  ## New Columns in radio_stations

  ### Visual Customization
  - `icon_url` (text) - URL to custom uploaded icon
  - `icon_emoji` (text) - Emoji icon if custom not used
  - `background_url` (text) - URL to custom uploaded background image
  - `background_color` (text) - Hex color code for solid background
  - `background_type` (text) - Type: 'solid', 'gradient', or 'image'

  ### Grid Positioning
  - `grid_row` (integer) - Row position 1-5
  - `grid_column` (integer) - Column position 1-4
  - `grid_page` (integer) - Page number (default 1)

  ## New Column in users_profiles
  - `confetti_shown` (boolean) - Flag for confetti animation shown

  ## Constraints
  - Unique constraint on (grid_row, grid_column, grid_page) to prevent overlap

  ## Security
  - All columns can be managed by admins through existing RLS policies
*/

-- Add visual customization columns to radio_stations
ALTER TABLE radio_stations
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS icon_emoji text DEFAULT '🎵',
  ADD COLUMN IF NOT EXISTS background_url text,
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS background_type text DEFAULT 'gradient';

-- Add grid positioning columns to radio_stations
ALTER TABLE radio_stations
  ADD COLUMN IF NOT EXISTS grid_row integer,
  ADD COLUMN IF NOT EXISTS grid_column integer,
  ADD COLUMN IF NOT EXISTS grid_page integer DEFAULT 1;

-- Add unique constraint for grid positioning (prevents overlap)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'radio_stations_grid_position_unique'
  ) THEN
    ALTER TABLE radio_stations
      ADD CONSTRAINT radio_stations_grid_position_unique
      UNIQUE (grid_row, grid_column, grid_page);
  END IF;
END $$;

-- Add index for grid queries
CREATE INDEX IF NOT EXISTS idx_radio_stations_grid_position
  ON radio_stations(grid_page, grid_row, grid_column)
  WHERE grid_row IS NOT NULL AND grid_column IS NOT NULL;

-- Add confetti flag to users_profiles
ALTER TABLE users_profiles
  ADD COLUMN IF NOT EXISTS confetti_shown boolean DEFAULT false;

-- Add index for confetti queries
CREATE INDEX IF NOT EXISTS idx_users_profiles_confetti
  ON users_profiles(confetti_shown)
  WHERE confetti_shown = false;

-- Add helpful comments
COMMENT ON COLUMN radio_stations.icon_url IS 'URL to custom uploaded icon image from Supabase Storage';
COMMENT ON COLUMN radio_stations.icon_emoji IS 'Emoji character to use as icon if icon_url is not set';
COMMENT ON COLUMN radio_stations.background_url IS 'URL to custom uploaded background image from Supabase Storage';
COMMENT ON COLUMN radio_stations.background_color IS 'Hex color code (e.g. #FF5733) for solid color background';
COMMENT ON COLUMN radio_stations.background_type IS 'Type of background: solid (color), gradient (default), or image (upload)';
COMMENT ON COLUMN radio_stations.grid_row IS 'Row position in user dashboard grid (1-5)';
COMMENT ON COLUMN radio_stations.grid_column IS 'Column position in user dashboard grid (1-4)';
COMMENT ON COLUMN radio_stations.grid_page IS 'Page number in pagination (default 1)';
COMMENT ON COLUMN users_profiles.confetti_shown IS 'Flag indicating if confetti animation has been shown after first subscription';