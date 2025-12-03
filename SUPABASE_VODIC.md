# 🔗 Povezivanje sa Supabase - Kompletan Vodič

## 📊 Trenutno Stanje

Trenutno aplikacija koristi **localStorage** za čuvanje podataka. Ovo je odlično za development, ali za production treba preći na **Supabase**.

## 🎯 Cilj

Povezati aplikaciju sa Supabase bazom tako da:
- ✅ Svi podaci budu sačuvani u cloud-u
- ✅ Real-time sync između korisnika
- ✅ Automatski backup
- ✅ Scalable za hiljade korisnika

---

## 📋 Korak po Korak

### 1️⃣ Kreiraj Supabase Tabele

**Otvori:**
👉 https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit

**Idi na SQL Editor:**
1. Klikni **SQL Editor** u levom meniju
2. Klikni **New Query**
3. Otvori fajl `supabase/schema.sql` u projektu
4. Kopiraj **SVE** iz tog fajla
5. Paste u SQL Editor
6. Klikni **Run** (ili Ctrl+Enter)

**Proveri:**
1. Klikni **Table Editor**
2. Trebalo bi da vidiš 4 tabele:
   - ✅ `profiles` - Korisnički profili
   - ✅ `stations` - Radio stanice
   - ✅ `favorites` - Omiljene stanice
   - ✅ `listening_sessions` - Analytics

---

### 2️⃣ Proveri API Ključeve

**Tvoji API ključevi:**

```
URL: https://huyiaierkscuhxlvvtit.supabase.co

Public API Key (anon):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA

Secret API Key (service_role):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxNTczNSwiZXhwIjoyMDc4NzkxNzM1fQ.pq4j22DXgXD6ZJqylL9tySVim4h4an2SiTYlIJ3dVsQ
```

**NAPOMENA:** 
- Koristi **Public API Key** za frontend
- **Secret API Key** koristi SAMO u backend-u (nikad u frontend-u!)

---

### 3️⃣ Opcija A: Koristi localStorage (Trenutno)

**Prednosti:**
- ✅ Brzo za development
- ✅ Radi offline
- ✅ Nema potrebe za internet konekcijom

**Mane:**
- ❌ Podaci se gube ako obrišeš browser cache
- ❌ Nema real-time sync
- ❌ Nema backup-a

**Kako radi:**
- Sve je već podešeno u `src/lib/localStorage.ts`
- Automatski se inicijalizuju mock podaci
- Admin nalog: darkospira@gmail.com / Racivaci5!

---

### 3️⃣ Opcija B: Prebaci na Supabase (Production)

**Prednosti:**
- ✅ Podaci sačuvani u cloud-u
- ✅ Real-time sync
- ✅ Automatski backup
- ✅ Scalable

**Kako prebaciti:**

#### Korak 1: Kreiraj `.env` fajl (ako ne postoji)

```bash
VITE_SUPABASE_URL=https://huyiaierkscuhxlvvtit.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA
```

#### Korak 2: Ažuriraj AuthContext

Otvori `src/contexts/AuthContext.tsx` i zameni:

```typescript
// STARO (localStorage)
import { localAuth } from '../lib/localStorage';

// NOVO (Supabase)
import { supabaseAuth } from '../lib/supabase';
```

Zatim zameni sve `localAuth` sa `supabaseAuth`:

```typescript
// STARO
const { user, profile } = await localAuth.signIn(email, password);

// NOVO
const { user, profile } = await supabaseAuth.signIn(email, password);
```

#### Korak 3: Ažuriraj UserDashboard

Otvori `src/pages/UserDashboard.tsx` i zameni:

```typescript
// STARO
import { localStations } from '../lib/localStorage';

// NOVO
import { supabaseStations } from '../lib/supabase';
```

#### Korak 4: Ažuriraj AdminDashboard

Otvori `src/pages/AdminDashboard.tsx` i zameni:

```typescript
// STARO
import { localStations, localAuth } from '../lib/localStorage';

// NOVO
import { supabaseStations, supabaseAuth } from '../lib/supabase';
```

#### Korak 5: Restart Dev Server

```bash
# Zaustavi trenutni server (Ctrl+C)
# Pokreni ponovo
npm run dev
```

---

### 4️⃣ Testiranje Supabase Konekcije

#### Test 1: Registracija

1. Otvori aplikaciju
2. Klikni **Sign Up**
3. Unesi email i password
4. Registruj se
5. Proveri u Supabase Dashboard → Table Editor → profiles
6. Trebalo bi da vidiš novog korisnika!

#### Test 2: Login

1. Uloguj se sa novim nalogom
2. Proveri da li radi

#### Test 3: Stanice

1. Uloguj se kao admin
2. Dodaj novu stanicu
3. Proveri u Supabase Dashboard → Table Editor → stations
4. Trebalo bi da vidiš novu stanicu!

#### Test 4: Real-Time Sync

1. Otvori 2 browser-a
2. Uloguj se u oba
3. U jednom promeni stanicu (kao admin)
4. U drugom vidi promenu **ODMAH**!

---

## 🔄 Migracija Podataka

### Ako hoćeš da prebacis podatke iz localStorage u Supabase:

#### Korak 1: Izvuci podatke iz localStorage

Otvori browser console (F12) i unesi:

```javascript
// Izvuci stanice
const stations = localStorage.getItem('infinity_stations');
console.log(JSON.parse(stations));

// Izvuci profile
const profiles = localStorage.getItem('infinity_profiles');
console.log(JSON.parse(profiles));
```

#### Korak 2: Kopiraj podatke

Kopiraj output iz console.

#### Korak 3: Dodaj u Supabase

1. Idi u Supabase Dashboard
2. Table Editor → stations
3. Insert → Insert row
4. Paste podatke

---

## 🎯 Preporuka

### Za Development (Sada):
✅ Koristi **localStorage**
- Brže za testiranje
- Nema potrebe za internet
- Jednostavnije za debug

### Za Production (Kasnije):
✅ Prebaci na **Supabase**
- Real-time sync
- Cloud backup
- Scalable

---

## 📊 Supabase Dashboard

**Korisne stranice:**

1. **Table Editor** - Vidi i izmeni podatke
   👉 https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit/editor

2. **SQL Editor** - Pokreni SQL queries
   👉 https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit/sql

3. **Authentication** - Vidi korisnike
   👉 https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit/auth/users

4. **Database** - Vidi tabele i strukture
   👉 https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit/database/tables

5. **API** - Proveri API dokumentaciju
   👉 https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit/api

---

## 🔒 Security

### Row Level Security (RLS)

Supabase koristi RLS za zaštitu podataka:

- ✅ Korisnici mogu videti samo svoje podatke
- ✅ Admini mogu videti sve podatke
- ✅ Samo autentifikovani korisnici mogu pisati

**Policies su već podešene u `schema.sql`!**

---

## 🐛 Troubleshooting

### Greška: "Failed to fetch"

**Uzrok:** Supabase nije dostupan ili API ključevi nisu tačni

**Rešenje:**
1. Proveri internet konekciju
2. Proveri API ključeve u `.env`
3. Proveri da li je Supabase projekat aktivan

### Greška: "Row Level Security"

**Uzrok:** RLS policies nisu podešene

**Rešenje:**
1. Pokreni `schema.sql` ponovo
2. Proveri da li su policies kreirane u Supabase Dashboard

### Greška: "Table does not exist"

**Uzrok:** Tabele nisu kreirane

**Rešenje:**
1. Pokreni `schema.sql` u SQL Editor
2. Proveri da li su tabele kreirane

---

## 📞 Podrška

Ako imaš problema:
- 📧 Email: darkospira@gmail.com
- 🌐 Website: infinityplay.rs

---

## ✅ Checklist

- [ ] Supabase tabele kreirane
- [ ] API ključevi provereni
- [ ] `.env` fajl kreiran
- [ ] Testirao registraciju
- [ ] Testirao login
- [ ] Testirao dodavanje stanice
- [ ] Testirao real-time sync

---

**Srećno sa Supabase integracijom! 🚀**
