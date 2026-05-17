# 🔧 HITNE POPRAVKE ZA BAZU PODATAKA - InfinityPlay Radio

## 🚨 Problem
Greška: **"new row violates row-level security policy for table 'profiles'"**

Ova greška se javlja jer nedostaje RLS politika koja dozvoljava INSERT operaciju na `profiles` tabeli kada se novi korisnik registruje.

---

## ✅ REŠENJE - Korak po Korak

### 1️⃣ Otvori Supabase Dashboard
1. Idi na: https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit
2. Uloguj se sa svojim nalogom

### 2️⃣ Otvori SQL Editor
1. U levom meniju klikni na **"SQL Editor"**
2. Klikni na **"New query"**

### 3️⃣ Primeni Glavne Popravke (OBAVEZNO!)
1. Otvori fajl: `supabase/fix_rls_policies.sql`
2. **Kopiraj SVE** iz tog fajla
3. **Nalepi** u SQL Editor
4. Klikni **"Run"** (ili pritisni Ctrl+Enter / Cmd+Enter)
5. Sačekaj da se skripta izvrši (trebalo bi da vidiš "Success")

### 4️⃣ Primeni Dodatne Popravke (PREPORUČENO!)
1. Otvori fajl: `supabase/additional_fixes.sql`
2. **Kopiraj SVE** iz tog fajla
3. **Nalepi** u novi SQL Editor tab
4. Klikni **"Run"**
5. Sačekaj da se skripta izvrši

---

## 🎯 Šta Ove Skripte Popravljaju?

### `fix_rls_policies.sql` (KRITIČNO!)
✅ **Dodaje INSERT politiku za profiles** - omogućava kreiranje profila pri registraciji  
✅ **Popravlja trigger funkciju** - `handle_new_user()` sada radi sa SECURITY DEFINER  
✅ **Ažurira sve RLS politike** - za profiles, stations, favorites, listening_sessions  
✅ **Dodaje DELETE politiku** - admini mogu brisati profile  

### `additional_fixes.sql` (DODATNO)
✅ **Dodaje nedostajuće kolone** - ako neke kolone ne postoje  
✅ **Kreira helper funkcije** - za lakše ažuriranje profila  
✅ **Omogućava Realtime** - za sve tabele  
✅ **Admin funkcije** - bulk operacije, admin_update_profile  
✅ **Analytics funkcije** - record_listening_session  

---

## 🧪 TESTIRANJE

Nakon primene ovih popravki:

### Test 1: Registracija Novog Korisnika
1. Idi na: https://radio.infinityplay.rs
2. Klikni na "Započni Sada" (bilo koji paket)
3. Klikni na "Nemate nalog? Registrujte se"
4. Popuni formu i klikni "Registruj se"
5. **Očekivani rezultat**: Uspešna registracija bez greške!

### Test 2: Proveri Konzolu
1. Otvori Developer Tools (F12)
2. Idi na "Console" tab
3. Pokušaj registraciju
4. **Očekivani rezultat**: Nema 400 greške sa Supabase

### Test 3: Proveri Profil u Bazi
1. U Supabase Dashboard, idi na "Table Editor"
2. Otvori "profiles" tabelu
3. **Očekivani rezultat**: Vidiš novog korisnika sa popunjenim podacima

---

## 🔍 DODATNE PROVERE

### Proveri RLS Politike
```sql
-- Pokreni ovu query u SQL Editor-u da vidiš sve politike
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Proveri Trigger
```sql
-- Proveri da li trigger postoji
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users';
```

### Proveri Funkciju
```sql
-- Proveri da li funkcija postoji
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';
```

---

## 🆘 AKO I DALJE IMAŠ PROBLEMA

### Problem: "Success" ali i dalje greška pri registraciji
**Rešenje**: 
1. Proveri da li su politike zaista kreirane (koristi query iznad)
2. Možda trebaš da restartujete Supabase projekat:
   - Idi na Settings → General
   - Klikni "Pause project"
   - Sačekaj 30 sekundi
   - Klikni "Resume project"

### Problem: "Permission denied" greška
**Rešenje**:
1. Proveri da li si ulogovan kao vlasnik projekta
2. Proveri da li imaš admin prava u Supabase

### Problem: Trigger se ne izvršava
**Rešenje**:
```sql
-- Obriši i ponovo kreiraj trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Zatim ponovo pokreni fix_rls_policies.sql
```

---

## 📊 PROVERA STATUSA NAKON POPRAVKI

Pokreni ovu query da vidiš sve važne informacije:

```sql
-- Proveri sve
SELECT 
  'Profiles Count' as metric,
  COUNT(*)::text as value
FROM profiles

UNION ALL

SELECT 
  'Stations Count',
  COUNT(*)::text
FROM stations

UNION ALL

SELECT 
  'RLS Enabled on Profiles',
  CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END
FROM pg_class
WHERE relname = 'profiles'

UNION ALL

SELECT 
  'Trigger Exists',
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

---

## 🎉 ZAVRŠETAK

Nakon što primenite obe skripte:
1. ✅ Registracija će raditi bez greške
2. ✅ Profili će se automatski kreirati
3. ✅ Svi korisnici će moći da se registruju
4. ✅ Admini će moći da upravljaju svim podacima
5. ✅ Realtime će raditi za sve tabele

---

## 📞 KONTAKT ZA PODRŠKU

Ako imaš bilo kakvih problema, pošalji mi:
1. Screenshot greške iz konzole
2. Screenshot iz Supabase SQL Editor-a nakon pokretanja skripti
3. Rezultat query-ja za proveru RLS politika

**VAŽNO**: Obavezno prvo primeni `fix_rls_policies.sql` - to je najvažnija skripta!
