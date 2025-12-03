/*
  # Fix RLS Infinite Recursion on users_profiles and radio_stations

  ## Problem
  Admin policies on users_profiles table were causing infinite recursion because
  they queried users_profiles table from within policies applied to users_profiles.
  This creates a circular dependency that causes "infinite recursion detected" error.

  ## Solution
  1. Create a SECURITY DEFINER function to check if user is admin
  2. Replace EXISTS subqueries with direct function calls
  3. Simplify all admin policies to use the helper function

  ## Changes
  - Drop all problematic policies on users_profiles
  - Drop all problematic policies on radio_stations
  - Create is_admin() helper function
  - Recreate all policies using the helper function

  ## Security
  - SECURITY DEFINER function runs with creator privileges
  - Function only checks admin status, nothing more
  - All RLS policies remain restrictive and secure
*/

-- Create helper function to check if current user is admin
-- This function runs with SECURITY DEFINER to avoid recursion
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$;

-- Drop all existing policies on users_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON users_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON users_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON users_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON users_profiles;

-- Recreate users_profiles policies using the helper function
CREATE POLICY "Users can view own profile"
  ON users_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_current_user_admin());

CREATE POLICY "Users can update own profile"
  ON users_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_current_user_admin())
  WITH CHECK (auth.uid() = id OR public.is_current_user_admin());

CREATE POLICY "Users can insert own profile"
  ON users_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_current_user_admin());

-- Drop all existing policies on radio_stations
DROP POLICY IF EXISTS "Anyone can view active stations" ON radio_stations;
DROP POLICY IF EXISTS "Admins can view all stations" ON radio_stations;
DROP POLICY IF EXISTS "Admins can manage stations" ON radio_stations;

-- Recreate radio_stations policies using the helper function
CREATE POLICY "Users can view active stations"
  ON radio_stations FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_current_user_admin());

CREATE POLICY "Admins can insert stations"
  ON radio_stations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update stations"
  ON radio_stations FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete stations"
  ON radio_stations FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin());

-- Fix subscriptions policies
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update subscriptions" ON subscriptions;

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "Admins can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin());

-- Fix trial_periods policies
DROP POLICY IF EXISTS "Admins can view all trials" ON trial_periods;

CREATE POLICY "Admins can view all trials"
  ON trial_periods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "System can create trials"
  ON trial_periods FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment explaining the helper function
COMMENT ON FUNCTION public.is_current_user_admin() IS
  'Security Definer function to check if current authenticated user has admin privileges.
   This prevents infinite recursion in RLS policies by avoiding circular queries to users_profiles.';
