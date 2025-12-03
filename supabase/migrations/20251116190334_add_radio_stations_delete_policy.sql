/*
  # Add DELETE Policy for Radio Stations

  ## Overview
  Adds a DELETE policy to the radio_stations table to allow admins to delete stations.

  ## Security
  - Only admins (is_admin = true) can delete radio stations
  - Policy checks that the authenticated user has admin privileges
*/

-- Add DELETE policy for radio_stations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'radio_stations' AND policyname = 'Only admins can delete stations'
  ) THEN
    CREATE POLICY "Only admins can delete stations"
      ON radio_stations FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM users_profiles
          WHERE users_profiles.id = auth.uid()
          AND users_profiles.is_admin = true
        )
      );
  END IF;
END $$;
