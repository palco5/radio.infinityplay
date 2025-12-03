/*
  # Seed Initial Data - Demo Radio Stanice i Test Korisnici

  ## Pregled
  Ova migracija dodaje inicijalne demo podatke u bazu:
  - Demo radio stanice različitih žanrova
  - Mogućnost kreiranja admin korisnika (mora biti kreiran kroz Supabase Auth prvo)

  ## Demo Radio Stanice
  Dodaje 15+ demo radio stanica sa različitim žanrovima za testiranje

  ## Napomena
  Admin korisnik sa email-om darkospira@gmail.com mora biti prvo registrovan
  kroz aplikaciju, a onda će ova migracija dodati admin privilegije.

  ## Security
  - Sve stanice su aktivne i javno dostupne
  - Admin privilegije se dodaju samo ako korisnik postoji
*/

-- Insert demo radio stations (ako već ne postoje)
INSERT INTO radio_stations (name, description, genre, stream_url, bitrate, is_featured, is_active) VALUES
  (
    'Infinity Pop Radio',
    'Najbolji pop hitovi non-stop',
    'Pop',
    'https://stream.infinityplay.rs/pop',
    128,
    true,
    true
  ),
  (
    'Infinity Rock Station',
    'Legendarni rock klasici i novi hitovi',
    'Rock',
    'https://stream.infinityplay.rs/rock',
    192,
    true,
    true
  ),
  (
    'Infinity Jazz Lounge',
    'Opuštajući jazz za posebne momente',
    'Jazz',
    'https://stream.infinityplay.rs/jazz',
    128,
    true,
    true
  ),
  (
    'Infinity Electronic Beats',
    'Elektronska muzika za modernu energiju',
    'Electronic',
    'https://stream.infinityplay.rs/electronic',
    192,
    true,
    true
  ),
  (
    'Infinity Chill Vibes',
    'Relaksirajuće melodije za opuštanje',
    'Chill',
    'https://stream.infinityplay.rs/chill',
    128,
    true,
    true
  ),
  (
    'Infinity Hip Hop',
    'Najbolji hip hop i rap hitovi',
    'Hip Hop',
    'https://stream.infinityplay.rs/hiphop',
    192,
    false,
    true
  ),
  (
    'Infinity Classical',
    'Klasična muzika za finu atmosferu',
    'Classical',
    'https://stream.infinityplay.rs/classical',
    128,
    false,
    true
  ),
  (
    'Infinity Country Road',
    'Country muzika i folk tradicija',
    'Country',
    'https://stream.infinityplay.rs/country',
    128,
    false,
    true
  ),
  (
    'Infinity Reggae Waves',
    'Pozitivna reggae vibracija',
    'Reggae',
    'https://stream.infinityplay.rs/reggae',
    128,
    false,
    true
  ),
  (
    'Infinity Metal Thunder',
    'Snažni metal zvuci',
    'Metal',
    'https://stream.infinityplay.rs/metal',
    192,
    false,
    true
  ),
  (
    'Infinity Blues Corner',
    'Autentični blues zvuk',
    'Blues',
    'https://stream.infinityplay.rs/blues',
    128,
    false,
    true
  ),
  (
    'Infinity R&B Soul',
    'Soulful R&B hitovi',
    'R&B',
    'https://stream.infinityplay.rs/rnb',
    128,
    false,
    true
  ),
  (
    'Infinity Dance Floor',
    'Dance hitovi za ples i zabavu',
    'Dance',
    'https://stream.infinityplay.rs/dance',
    192,
    false,
    true
  ),
  (
    'Infinity Indie Scene',
    'Nezavisna indie muzika',
    'Indie',
    'https://stream.infinityplay.rs/indie',
    128,
    false,
    true
  ),
  (
    'Infinity Latin Fire',
    'Latinoamerička strast i ritam',
    'Latin',
    'https://stream.infinityplay.rs/latin',
    128,
    false,
    true
  )
ON CONFLICT DO NOTHING;

-- Update admin status for darkospira@gmail.com if user exists
-- Napomena: Korisnik mora biti prvo registrovan kroz aplikaciju
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users_profiles WHERE email = 'darkospira@gmail.com'
  ) THEN
    UPDATE users_profiles
    SET
      is_admin = true,
      admin_level = 3,
      updated_at = now()
    WHERE email = 'darkospira@gmail.com';

    RAISE NOTICE 'Admin privilegije dodeljene korisniku darkospira@gmail.com';
  ELSE
    RAISE NOTICE 'Korisnik darkospira@gmail.com još nije registrovan. Admin privilegije će biti dodeljene nakon registracije.';
  END IF;
END $$;

-- Verify data was inserted
DO $$
DECLARE
  station_count integer;
  category_count integer;
BEGIN
  SELECT COUNT(*) INTO station_count FROM radio_stations;
  SELECT COUNT(*) INTO category_count FROM business_categories;

  RAISE NOTICE '=================================';
  RAISE NOTICE 'INFINITY PLAY RADIO - SEED DATA';
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Radio stanice ukupno: %', station_count;
  RAISE NOTICE 'Business kategorije: %', category_count;
  RAISE NOTICE '=================================';

  IF station_count = 0 THEN
    RAISE WARNING 'Nema radio stanica u bazi! Proveri da li je migracija uspela.';
  END IF;

  IF category_count = 0 THEN
    RAISE WARNING 'Nema business kategorija u bazi! Proveri prethodne migracije.';
  END IF;
END $$;
