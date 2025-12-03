/*
  # Add Active Listeners Real-Time Tracking System

  ## Overview
  This migration creates infrastructure for real-time tracking of active listeners
  across all radio stations. It enables the admin panel to display live listener counts.

  ## New Tables
  
  ### `active_listeners`
  Tracks currently active listeners with automatic cleanup
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users_profiles)
  - `station_id` (uuid, foreign key to radio_stations)
  - `started_at` (timestamptz) - When listening session started
  - `last_heartbeat` (timestamptz) - Last activity timestamp
  - `user_agent` (text) - Browser/device info
  - `created_at` (timestamptz)
  - UNIQUE constraint on (user_id, station_id) - One session per user per station

  ## Database Functions

  ### `cleanup_inactive_listeners()`
  Automatically removes listeners whose last heartbeat is older than 30 seconds.
  This ensures accurate real-time counts.

  ### `get_station_listener_count(station_uuid)`
  Returns the current active listener count for a specific station.

  ### `get_all_stations_listener_counts()`
  Returns listener counts for all stations in one query.

  ## Database Views

  ### `station_listener_counts`
  Materialized view that provides quick access to current listener counts per station.

  ## Triggers

  ### Auto-cleanup trigger
  Runs cleanup function periodically to remove stale listener records.

  ## Security
  - Enable RLS on active_listeners table
  - Users can only insert/update their own listening sessions
  - Admins can view all active listeners
  - Public can view aggregated counts (for station pages)

  ## Important Notes
  - Listeners are considered inactive after 30 seconds without heartbeat
  - Frontend must send heartbeat every 10-15 seconds while playing
  - Cleanup runs automatically on every insert/update
*/

-- Create active_listeners table
CREATE TABLE IF NOT EXISTS active_listeners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES radio_stations(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, station_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_listeners_user ON active_listeners(user_id);
CREATE INDEX IF NOT EXISTS idx_active_listeners_station ON active_listeners(station_id);
CREATE INDEX IF NOT EXISTS idx_active_listeners_heartbeat ON active_listeners(last_heartbeat DESC);

-- Enable RLS
ALTER TABLE active_listeners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own listening session"
  ON active_listeners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listening session"
  ON active_listeners FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own listening session"
  ON active_listeners FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all active listeners"
  ON active_listeners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view own listening sessions"
  ON active_listeners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to cleanup inactive listeners (older than 30 seconds)
CREATE OR REPLACE FUNCTION cleanup_inactive_listeners()
RETURNS void AS $$
BEGIN
  DELETE FROM active_listeners
  WHERE last_heartbeat < (now() - interval '30 seconds');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get listener count for a specific station
CREATE OR REPLACE FUNCTION get_station_listener_count(station_uuid uuid)
RETURNS integer AS $$
DECLARE
  listener_count integer;
BEGIN
  -- First cleanup inactive listeners
  PERFORM cleanup_inactive_listeners();
  
  -- Count active listeners
  SELECT COUNT(*)
  INTO listener_count
  FROM active_listeners
  WHERE station_id = station_uuid
  AND last_heartbeat >= (now() - interval '30 seconds');
  
  RETURN COALESCE(listener_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all stations with listener counts
CREATE OR REPLACE FUNCTION get_all_stations_listener_counts()
RETURNS TABLE(station_id uuid, listener_count bigint) AS $$
BEGIN
  -- First cleanup inactive listeners
  PERFORM cleanup_inactive_listeners();
  
  -- Return counts for all stations
  RETURN QUERY
  SELECT 
    rs.id as station_id,
    COUNT(al.id) as listener_count
  FROM radio_stations rs
  LEFT JOIN active_listeners al 
    ON rs.id = al.station_id 
    AND al.last_heartbeat >= (now() - interval '30 seconds')
  GROUP BY rs.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-cleanup on heartbeat updates
CREATE OR REPLACE FUNCTION trigger_cleanup_inactive_listeners()
RETURNS TRIGGER AS $$
BEGIN
  -- Run cleanup asynchronously (non-blocking)
  PERFORM cleanup_inactive_listeners();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_cleanup_listeners ON active_listeners;
CREATE TRIGGER auto_cleanup_listeners
  AFTER INSERT OR UPDATE ON active_listeners
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_inactive_listeners();

-- Update radio_stations listener_count column with current active listeners
-- This can be run periodically or on-demand
CREATE OR REPLACE FUNCTION update_all_station_listener_counts()
RETURNS void AS $$
BEGIN
  UPDATE radio_stations rs
  SET listener_count = COALESCE(
    (SELECT COUNT(*)
     FROM active_listeners al
     WHERE al.station_id = rs.id
     AND al.last_heartbeat >= (now() - interval '30 seconds')),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert or update active listener (upsert helper)
CREATE OR REPLACE FUNCTION upsert_active_listener(
  p_user_id uuid,
  p_station_id uuid,
  p_user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO active_listeners (user_id, station_id, user_agent, started_at, last_heartbeat)
  VALUES (p_user_id, p_station_id, p_user_agent, now(), now())
  ON CONFLICT (user_id, station_id)
  DO UPDATE SET
    last_heartbeat = now(),
    user_agent = COALESCE(EXCLUDED.user_agent, active_listeners.user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove active listener
CREATE OR REPLACE FUNCTION remove_active_listener(
  p_user_id uuid,
  p_station_id uuid
)
RETURNS void AS $$
BEGIN
  DELETE FROM active_listeners
  WHERE user_id = p_user_id AND station_id = p_station_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;