# 🚀 FINALNO UPUTSTVO - Sve je Spremno!

## ✅ ŠTA SAM URADIO

1. ✅ Dodao Supabase podatke u `.env`
2. ✅ Dodao FTP podatke u `scripts/upload-to-loopia.js`
3. ✅ Dodao Resend API key
4. ✅ Napravio build sa svim podacima

**Sajt je spreman za deploy!** 🎉

---

## 🎯 DVA NAČINA ZA DEPLOY

### Način 1: Automatski (Preporučeno) ⚡

Jednostavno ukucaj:
```bash
npm run deploy
```

Ova komanda će:
1. Build-ovati sajt
2. Automatski upload-ovati na Loopia server

**To je to!** Sajt će biti online za ~1 minut.

---

### Način 2: Ručno 📁

Ako automatski ne radi, možeš ručno:

1. **Otvori FileZilla ili Loopia File Manager**
2. **Konektuj se:**
   - Server: `ftpcluster.loopia.se`
   - Username: `infinityplay.rs`
   - Password: `Sp/R/d0N0v`

3. **Idi u folder:** `/radio.infinityplay.rs/public_html/`

4. **Obriši sve stare fajlove** iz tog foldera

5. **Upload-uj SVE iz `dist` foldera:**
   - `index.html`
   - folder `assets/`
   - `.htaccess`
   - `logo.png` (ako postoji)

---

## 🗄️ KREIRANJE SUPABASE TABELA

**VAŽNO:** Pre nego što sajt proradi, moraš kreirati tabele u Supabase!

### Korak 1: Otvori Supabase SQL Editor
1. Idi na https://supabase.com
2. Otvori projekat: `huyiaierkscuhxlvvtit`
3. Klikni **SQL Editor** (levo u meniju)

### Korak 2: Kreiraj Tabele

**Kopiraj i zalepi ovaj SQL kod, pa klikni "Run":**

```sql
-- =============================================
-- TABELA: profiles (Korisnici)
-- =============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  business_category text,
  custom_location text,
  subscription_tier text default 'free',
  subscription_status text default 'active',
  subscription_ends_at timestamptz,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  is_admin boolean default false,
  newsletter_subscribed boolean default false,
  email_notifications boolean default true,
  onboarding_completed boolean default false,
  confetti_shown boolean default false,
  theme_preference text default 'dark',
  jingle_interval_minutes integer default 7,
  total_listening_minutes integer default 0,
  recommended_stations text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policy: Users can read their own profile
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- Policy: Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Policy: Admins can read all profiles
create policy "Admins can read all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Policy: Admins can update all profiles
create policy "Admins can update all profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- =============================================
-- TABELA: radio_stations (Radio Stanice)
-- =============================================
create table radio_stations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  genre text not null,
  logo_url text,
  stream_url text not null,
  medicp_id text,
  bitrate integer default 128,
  is_featured boolean default false,
  is_active boolean default true,
  listener_count integer default 0,
  icon_url text,
  icon_emoji text default '🎵',
  background_url text,
  background_color text default '#10b981',
  background_type text default 'solid',
  grid_row integer,
  grid_column integer,
  grid_page integer default 1,
  recommended_for text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table radio_stations enable row level security;

-- Policy: Everyone can read active stations
create policy "Anyone can read active stations"
  on radio_stations for select
  using (is_active = true);

-- Policy: Admins can do everything
create policy "Admins can manage stations"
  on radio_stations for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );
```

---

## 🧪 TESTIRANJE

### Test 1: Registracija i Login
1. Otvori sajt: `http://radio.infinityplay.rs`
2. Registruj se sa email-om
3. Proveri da li možeš da se uloguješ

### Test 2: Admin Panel
1. Prvo moraš **ručno dodati admin privilegije** u Supabase:
   - Idi u **Table Editor** → **profiles**
   - Pronađi svoj profil
   - Promeni `is_admin` na `true`
2. Osveži sajt
3. Trebalo bi da vidiš Admin Dashboard
4. Dodaj novu stanicu
5. Proveri u Supabase → **radio_stations** tabeli

### Test 3: Real-Time Sinhronizacija
1. Dodaj stanicu na kompjuteru
2. Otvori sajt na telefonu
3. Osveži stranicu
4. **Stanica bi trebalo da se vidi!** 🎉

---

## 📋 CHECKLIST

- [ ] Pokrenuo `npm run deploy` (ili ručno upload)
- [ ] Kreirao tabele u Supabase (SQL gore)
- [ ] Registrovao se na sajtu
- [ ] Dodao admin privilegije u Supabase
- [ ] Testirao dodavanje stanica
- [ ] Testirao real-time sinhronizaciju

---

## 🆘 AKO NEŠTO NE RADI

### Problem: "npm run deploy" ne radi
**Rešenje:** Koristi Način 2 (ručni upload preko FileZilla)

### Problem: Ne mogu da se registrujem
**Rešenje:** Proveri da li si kreirao tabele u Supabase

### Problem: Ne vidim Admin Dashboard
**Rešenje:** Moraš ručno dodati `is_admin = true` u Supabase Table Editor

### Problem: Stanice se ne sinhronizuju
**Rešenje:** Proveri da li su policies dobro kreirani u Supabase

---

**Javi mi kako je prošlo!** 🚀
