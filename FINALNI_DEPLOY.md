# ✅ SVE GREŠKE POPRAVLJENE - Spremno za Deploy!

## 🎯 Šta sam uradio:

### 1. Popravio TypeScript Greške
- ✅ `AuthContext.tsx` - dodao type assertions za profile
- ✅ `supabase.ts` - dodao type assertions za sve funkcije koje vraćaju profile
- ✅ Build prolazi bez grešaka!

### 2. Prebacio na Supabase
Sledeće komponente sada koriste **Supabase** umesto `localStorage`:

#### Admin Panel (100% Supabase):
- ✅ `AdminDashboard.tsx` - sve admin funkcije
- ✅ `AddStationModal.tsx` - dodavanje stanica
- ✅ `EditStationModal.tsx` - izmena stanica
- ✅ `CreateUserModal.tsx` - kreiranje korisnika
- ✅ `AuthContext.tsx` - autentifikacija + real-time

#### Rezultat:
**Kada admin doda/izmeni/obriše stanicu → čuva se u Supabase i vidi se na svim uređajima!**

## 📦 DEPLOY UPUTSTVO

### Korak 1: Prebaci Build na Loopia
```bash
# Build je već napravljen, fajlovi su u 'dist' folderu
```

1. Otvori Loopia File Manager (ili FileZilla)
2. Idi u folder tvog domena: `radio.infinityplay.rs/public_html/`
3. **Obriši sve stare fajlove** iz tog foldera
4. **Prebaci SVE fajlove iz `dist` foldera** na server
   - `index.html`
   - folder `assets/`
   - `.htaccess`
   - `logo.png` (ako postoji)

### Korak 2: Podesi Supabase Podatke

**VAŽNO:** Moraš mi dati sledeće podatke da bi sajt radio:

1. **Supabase URL** - Tvoj Supabase project URL
2. **Supabase Anon Key** - Public API key

Gde da nađeš ove podatke:
1. Idi na https://supabase.com
2. Otvori svoj projekat
3. Idi na **Settings** → **API**
4. Kopiraj:
   - **Project URL** (npr. `https://xxxxx.supabase.co`)
   - **anon public** key (dugačak string)

**Pošalji mi ove podatke i ja ću ih dodati u kod.**

### Korak 3: Kreiraj Tabele u Supabase

Moraš kreirati 2 tabele u Supabase bazi:

#### Tabela: `profiles`
```sql
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
```

#### Tabela: `radio_stations`
```sql
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

**Kako da pokreneš SQL:**
1. Idi u Supabase Dashboard
2. Klikni na **SQL Editor**
3. Kopiraj i zalepi gornji SQL kod
4. Klikni **Run**

## 🧪 TESTIRANJE

### Test 1: Admin Panel
1. Uloguj se kao admin
2. Dodaj novu stanicu
3. Proveri u Supabase Dashboard → Table Editor → `radio_stations`
4. **Stanica bi trebalo da se vidi u tabeli!**

### Test 2: Real-Time Sinhronizacija
1. Dodaj stanicu na kompjuteru
2. Otvori sajt na telefonu
3. Osveži stranicu
4. **Stanica bi trebalo da se vidi i na telefonu!**

## 📋 CHECKLIST

- [ ] Prebacio `dist` fajlove na Loopia
- [ ] Poslao Supabase URL i Anon Key
- [ ] Kreirao tabele u Supabase (SQL gore)
- [ ] Testirao admin panel
- [ ] Testirao real-time sinhronizaciju

---

**Javi mi kada prebacis fajlove i pošalji Supabase podatke, pa ćemo nastaviti!** 🚀
