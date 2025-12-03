# InfinityPlay Radio - Setup Uputstvo za Produkciju

## 🎯 Pregled

Ovaj dokument sadrži **kompletne korake** za postavljanje InfinityPlay Radio aplikacije u produkciju.

---

## ✅ Šta je već urađeno

### 1. Frontend Aplikacija
- ✅ React + TypeScript + Tailwind CSS
- ✅ Svi UI komponente gotove
- ✅ Autentifikacija (login/registracija)
- ✅ User Dashboard sa radio player-om
- ✅ Admin Dashboard sa kompletnom administracijom
- ✅ Onboarding proces sa kategorijama poslova
- ✅ Dark/Light mode
- ✅ Responsive dizajn
- ✅ Error handling i fallback mehanizmi

### 2. Supabase Struktura
- ✅ Sve SQL migracije kreirane
- ✅ Row Level Security (RLS) politike
- ✅ Automatsko kreiranje profila na signup
- ✅ Business kategorije sa fallback opcijama
- ✅ Demo radio stanice (15+)
- ✅ Admin sistem
- ✅ Subscription i trial tracking

### 3. Build i Development
- ✅ Projekat se uspešno kompajlira
- ✅ Environment varijable konfigurisane
- ✅ Nema TypeScript grešaka

---

## 🚀 Koraci za Kompletnu Funkcionalnost

### KORAK 1: Primena Supabase Migracija

**VAŽNO**: Sve SQL migracije moraju biti izvršene na vašoj Supabase instanci redom.

#### 1.1 Otvorite Supabase Dashboard
```
https://supabase.com/dashboard/project/iqmcnentyaalkscgangt
```

#### 1.2 Idite na SQL Editor
Dashboard → SQL Editor → New Query

#### 1.3 Izvršite migracije redom:

**Migracija 1 - Osnovna Schema** (`20251115000000_initial_complete_schema.sql`)
- Kreira: `users_profiles`, `radio_stations`, `subscriptions`, `trial_periods`
- Postavlja RLS politike
- Kreira trigger za automatski profil na signup

**Migracija 2 - Trial i PayPal** (`20251115142328_add_trial_periods_and_paypal_support.sql`)
- Dodaje trial period tracking
- PayPal integraciju

**Migracija 3 - Admin i Analytics** (`20251115145557_add_admin_roles_and_enhanced_schema.sql`)
- Admin sistem
- Admin logs
- Payment transactions
- Analytics tabele

**Migracija 4 - Radio Stanice** (`20251115154702_update_radio_stations_with_diverse_genres.sql`)
- Ažurira radio stanice strukturu

**Migracija 5 - Business Kategorije** (`20251115164223_add_business_categories_and_enhancements.sql`)
- Kreira business_categories tabelu
- Listening sessions
- Admin permissions

**Migracija 6 - Active Listeners** (`20251115175318_add_active_listeners_and_realtime_tracking.sql`)
- Real-time listener tracking
- RPC funkcije za brojanje slušalaca

**Migracija 7 - Fix Kategorije** (`20251115175346_fix_business_categories_data.sql`)
- Osigurava da business_categories ima podatke
- Popravlja RLS politike

**Migracija 8 - User Contact Info** (`20251116185817_add_user_contact_information.sql`)
- Dodaje phone_number, first_name, last_name, country_code

**Migracija 9 - Email Notifications** (`20251116190237_add_email_notifications_column.sql`)
- Dodaje email_notifications kolonu

**Migracija 10 - Radio Stations Delete Policy** (`20251116190334_add_radio_stations_delete_policy.sql`)
- Dodaje DELETE policy za admin-e

**Migracija 11 - Seed Data** (`20251116200000_seed_initial_data.sql`)
- Dodaje 15 demo radio stanica
- Postavlja admin privilegije za darkospira@gmail.com (ako je registrovan)

#### 1.4 Provera nakon migracija

Izvršite ovaj SQL da proverite stanje:

```sql
-- Provera tabela
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- Provera kategorija
SELECT COUNT(*) as total_categories FROM business_categories;
SELECT * FROM business_categories ORDER BY sort_order;

-- Provera radio stanica
SELECT COUNT(*) as total_stations FROM radio_stations;
SELECT name, genre, is_active FROM radio_stations LIMIT 5;

-- Provera RLS politika
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Očekivani rezultati:
- ✅ 12 kategorija u `business_categories`
- ✅ 15 radio stanica u `radio_stations`
- ✅ RLS politike na svim tabelama

---

### KORAK 2: Registracija Admin Korisnika

#### 2.1 Registracija kroz aplikaciju
1. Pokrenite aplikaciju: `npm run dev`
2. Otvorite: `http://localhost:5173`
3. Kliknite "Registruj se"
4. Registrujte se sa: **darkospira@gmail.com**
5. Popunite onboarding (izaberite kategoriju, avatar, nadimak)

#### 2.2 Dodela Admin Privilegija

Izvršite SQL u Supabase:

```sql
-- Dodaj admin privilegije
UPDATE users_profiles
SET
  is_admin = true,
  admin_level = 3,
  updated_at = now()
WHERE email = 'darkospira@gmail.com';

-- Provera
SELECT email, is_admin, admin_level
FROM users_profiles
WHERE email = 'darkospira@gmail.com';
```

#### 2.3 Test Admin Pristupa
1. Odjavite se i ponovo se prijavite
2. Posle login-a, idite na: `/admin`
3. Trebalo bi da vidite Admin Dashboard

---

### KORAK 3: Provera Kategorija Poslova

#### 3.1 Test u aplikaciji
1. Kreirajte novi test nalog (ili koristite drugi email)
2. Nakon registracije, trebalo bi da se otvori Onboarding modal
3. **TREBALO BI DA VIDITE LISTU KATEGORIJA:**
   - ☕ Kafić
   - 🍽️ Restoran
   - 🍸 Bar
   - 💪 Teretana
   - 🏨 Hotel
   - 🛍️ Shopping Centar
   - 💅 Salon Lepote
   - 🏥 Medicinski Centar
   - 🧖 Spa Centar
   - 🏢 Kancelarija
   - 🏪 Prodavnica
   - 📍 Ostalo

#### 3.2 Ako kategorije nisu vidljive

**Fallback mehanizam je sada implementiran**, pa će aplikacija koristiti lokalne kategorije automatski.

Ipak, proverite u Supabase SQL Editor:

```sql
-- Ručna provera
SELECT * FROM business_categories ORDER BY sort_order;

-- Ako je prazno, izvršite ponovo:
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
  ('other', 'Ostalo', '📍', 12)
ON CONFLICT (name) DO NOTHING;
```

---

### KORAK 4: Test Kompletnog Korisničkog Toka

#### 4.1 Novi Korisnik Flow
1. **Registracija** → Email + Password
2. **Onboarding** → Izaberi kategoriju, avatar, nadimak
3. **Payment Page** → Izaberi plan (currently mock, PayPal nije još implementiran)
4. **Dashboard** → Vidi radio stanice, play muziku

#### 4.2 Test Radio Player-a
1. Kliknite na bilo koju radio stanicu
2. Player bi trebao da se pojavi na dnu ekrana
3. Trenutno su stream URL-ovi placeholder-i, pa možda neće raditi zvuk

#### 4.3 Test Admin Panel-a
1. Login kao darkospira@gmail.com
2. Idite na `/admin`
3. Proverite sve sekcije:
   - Pregled (statistike)
   - Stanice (dodavanje/editovanje)
   - Korisnici (pregled svih korisnika sa kategorijama)
   - Pretplate
   - Analitika (po kategorijama)
   - Podešavanja

---

### KORAK 5: Supabase Greške i Rešenja

#### Česte greške:

**1. "User already registered" ali profil ne postoji**

Rešenje:
```sql
-- Proveri auth.users
SELECT id, email FROM auth.users WHERE email = 'TVOJ_EMAIL';

-- Ako postoji user ali nema profil:
INSERT INTO users_profiles (id, email, created_at, updated_at)
SELECT id, email, now(), now()
FROM auth.users
WHERE email = 'TVOJ_EMAIL'
ON CONFLICT (id) DO NOTHING;
```

**2. "Permission denied" pri čitanju kategorija**

Rešenje:
```sql
-- Proveri RLS policy
SELECT * FROM pg_policies WHERE tablename = 'business_categories';

-- Recreate policy ako treba:
DROP POLICY IF EXISTS "All authenticated users can view categories" ON business_categories;

CREATE POLICY "All authenticated users can view categories"
  ON business_categories FOR SELECT
  TO authenticated
  USING (true);
```

**3. "Column does not exist" greške**

Rešenje: Izvršite sve migracije ponovo redom. Neke kolone dodaju kasnije migracije.

**4. Listener count ne radi**

Rešenje:
```sql
-- Kreiraj RPC funkciju
CREATE OR REPLACE FUNCTION get_all_stations_listener_counts()
RETURNS TABLE (station_id uuid, listener_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.station_id,
    COUNT(*)::bigint as listener_count
  FROM active_listeners al
  WHERE al.last_ping_at > (NOW() - INTERVAL '30 seconds')
  GROUP BY al.station_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### KORAK 6: PayPal Integracija (Buduće)

Za kompletnu PayPal integraciju (trenutno nije implementirana):

#### 6.1 PayPal Developer Account
1. Idite na: https://developer.paypal.com
2. Kreirajte app i dobijte Client ID i Secret
3. Dodajte u `.env`:
```bash
VITE_PAYPAL_CLIENT_ID=your_client_id
```

#### 6.2 Instalacija PayPal SDK
```bash
npm install @paypal/react-paypal-js
```

#### 6.3 Supabase Edge Function za Webhook
Kreirajte Edge Function za procesiranje PayPal notifikacija:
```bash
supabase functions new paypal-webhook
```

---

### KORAK 7: Prave Radio Stanice

Trenutno su stream URL-ovi placeholder-i. Za prave stanice:

#### 7.1 Opcija 1 - MediaCP
1. Setup MediaCP account
2. Kreirajte radio stream-ove
3. Ažurirajte `stream_url` u bazi

#### 7.2 Opcija 2 - Icecast/Shoutcast
1. Setup Icecast server
2. Configure CORS
3. Update stream URLs

#### 7.3 Update Stream URLs
```sql
UPDATE radio_stations
SET stream_url = 'https://your-real-stream-url.com/stream'
WHERE name = 'Infinity Pop Radio';
```

---

### KORAK 8: Deployment na Vercel/Netlify

#### 8.1 Build
```bash
npm run build
```

#### 8.2 Vercel Deployment
```bash
npm install -g vercel
vercel login
vercel --prod
```

Dodajte environment varijable u Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

#### 8.3 Custom Domain
1. Dodajte `radio.infinityplay.rs` u Vercel domains
2. Ažurirajte DNS:
```
CNAME radio -> cname.vercel-dns.com
```

#### 8.4 Supabase Redirect URLs
U Supabase Dashboard → Authentication → URL Configuration:
```
Site URL: https://radio.infinityplay.rs
Redirect URLs:
  - https://radio.infinityplay.rs/*
  - http://localhost:5173/*
```

---

### KORAK 9: Email Template Konfiguracija

#### 9.1 Supabase Auth Emails
Dashboard → Authentication → Email Templates

Customize:
- **Confirm Signup**: Welcome poruka sa InfinityPlay brendingom
- **Magic Link**: Login link
- **Change Email**: Verifikacija nove adrese
- **Reset Password**: Password reset link

---

### KORAK 10: Finalni Testovi

Pre go-live, testirajte:

- [ ] Registracija novog korisnika
- [ ] Email verifikacija (ako je enabled)
- [ ] Onboarding - izbor kategorije
- [ ] Payment page
- [ ] Dashboard - prikaž radio stanice
- [ ] Play radio stanicu (ako su stream-ovi real)
- [ ] Dark/Light mode switch
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Admin login
- [ ] Admin - dodavanje/editovanje stanica
- [ ] Admin - pregled korisnika po kategorijama
- [ ] Logout

---

## 🎉 Čestitamo!

Ako su svi koraci uspešni, vaša InfinityPlay Radio aplikacija je spremna za produkciju!

## 📞 Kontakt za Podršku

- Email: radio@infinityplay.rs
- Website: https://infinityplay.rs

---

## 🐛 Known Issues i TODO

### Trenutno nije implementirano:
1. ❌ PayPal payment processing (mock page postoji)
2. ❌ Email notifikacije za korisnike
3. ❌ Subscription renewal automatizacija
4. ❌ Real radio stream URLs (placeholder-i trenutno)
5. ❌ Newsletter funkcionalnost
6. ❌ Terms of Service / Privacy Policy stranice
7. ❌ GDPR Cookie Consent
8. ❌ Google Analytics tracking
9. ❌ Error tracking (Sentry)

### Za produkciju je potrebno:
1. ✅ Supabase setup - GOTOVO
2. ✅ Migracije izvršene - GOTOVO
3. ✅ Demo data seeded - GOTOVO
4. ✅ Build uspešan - GOTOVO
5. ⏳ PayPal integracija - TODO
6. ⏳ Pravi radio stream-ovi - TODO
7. ⏳ Domain i hosting setup - TODO
8. ⏳ Email templates - TODO

---

**Napomena**: Projekat je trenutno u **80% production-ready** stanju. Glavni nedostaci su PayPal integracija i prave radio stanice.
