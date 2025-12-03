/*
  # Dodavanje podrške za trial periode i PayPal integraciju

  1. Nove Tabele
    - `trial_periods`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users_profiles)
      - `subscription_tier` (text)
      - `started_at` (timestamptz)
      - `ends_at` (timestamptz)
      - `is_active` (boolean)
      - `converted_to_paid` (boolean)
      - `created_at` (timestamptz)

  2. Izmene postojećih tabela
    - Dodavanje `paypal_subscription_id` i `paypal_customer_id` u `subscriptions`
    - Dodavanje `paypal_payment_id` u `payments`
    - Dodavanje `trial_ends_at` u `users_profiles`
    - Dodavanje `theme_preference` u `users_profiles`

  3. Sigurnost
    - Omogućavanje RLS na `trial_periods` tabeli
    - Dodavanje politika za pristup sopstvenim podacima
*/

-- Kreiranje trial_periods tabele
CREATE TABLE IF NOT EXISTS trial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  subscription_tier text NOT NULL CHECK (subscription_tier IN ('basic-radio', 'branded-radio', 'host-radio')),
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  converted_to_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Dodavanje PayPal kolona u subscriptions tabelu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'paypal_subscription_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN paypal_subscription_id text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'paypal_customer_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN paypal_customer_id text;
  END IF;
END $$;

-- Dodavanje PayPal kolone u payments tabelu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'paypal_payment_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN paypal_payment_id text UNIQUE;
  END IF;
END $$;

-- Dodavanje trial_ends_at i theme_preference u users_profiles tabelu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN trial_ends_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profiles' AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE users_profiles ADD COLUMN theme_preference text DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark'));
  END IF;
END $$;

-- Omogućavanje RLS na trial_periods tabeli
ALTER TABLE trial_periods ENABLE ROW LEVEL SECURITY;

-- Politike za trial_periods tabelu
CREATE POLICY "Korisnici mogu videti svoje trial periode"
  ON trial_periods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Korisnici mogu kreirati svoje trial periode"
  ON trial_periods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Korisnici mogu ažurirati svoje trial periode"
  ON trial_periods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
