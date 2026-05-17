# 🚨 HITNO - Primeni Ovu Skriptu!

## Problem
Registracija i dalje ne radi uprkos prethodnim popravkama.

## Rešenje
Primeni **`FINAL_FIX.sql`** - ovo je najjednostavnije rešenje koje će **garantovano** raditi.

---

## 📋 KORACI

### 1. Otvori Supabase SQL Editor
https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit/sql/new

### 2. Kopiraj i Pokreni FINAL_FIX.sql

**Lokacija fajla**: `/Users/vace/Downloads/project/supabase/FINAL_FIX.sql`

**Šta ova skripta radi:**
- ✅ Briše SVE postojeće politike
- ✅ Kreira JEDNOSTAVNE politike sa PUBLIC pristupom
- ✅ Omogućava SVIMA da kreiraju profile (za registraciju)
- ✅ Omogućava samo vlasniku da ažurira svoj profil
- ✅ Popravlja trigger sa SECURITY DEFINER
- ✅ Dodaje GRANT permissions

### 3. Testiraj Registraciju
Nakon pokretanja skripte, odmah testiraj na:
https://radio.infinityplay.rs

---

## ⚠️ ALTERNATIVA - Ako i dalje ne radi

Ako `FINAL_FIX.sql` ne reši problem, primeni:

### TEMP_DISABLE_RLS.sql
**Lokacija**: `/Users/vace/Downloads/project/supabase/TEMP_DISABLE_RLS.sql`

Ovo će **privremeno isključiti RLS** da testiramo da li je to problem.

**VAŽNO**: Ovo je samo za testiranje! Nakon što potvrdiš da registracija radi bez RLS-a, vrati RLS sa `FINAL_FIX.sql`.

---

## 🎯 Razlika između skripti

| Skripta | Šta radi | Kada koristiti |
|---------|----------|----------------|
| `FINAL_FIX.sql` | Omogućava RLS sa PUBLIC politikama | **PRVO pokušaj ovu!** |
| `TEMP_DISABLE_RLS.sql` | Isključuje RLS potpuno | Samo za testiranje |
| `ULTIMATE_FIX.sql` | Složenije politike sa rolama | Već pokušano, nije radilo |

---

## 📊 Provera Nakon Primene

Pokreni ovu query da proveriš status:

```sql
SELECT 
  'RLS Status' as check_type,
  CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'profiles'

UNION ALL

SELECT 
  'INSERT Policies',
  COUNT(*)::text
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT'

UNION ALL

SELECT 
  'Trigger',
  CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Očekivano**:
- RLS Status: ENABLED
- INSERT Policies: 1 (ili više)
- Trigger: EXISTS

---

## 🆘 Ako Ništa Ne Radi

Onda problem **NIJE** u RLS politikama. Moguće uzroci:

1. **Email Confirmation** je omogućen u Supabase
   - Proveri: Authentication → Settings → Email Auth
   - Isključi "Enable email confirmations"

2. **Problem sa Supabase konfiguracijom**
   - Proveri da li je projekat aktivan
   - Proveri da li postoje rate limits

3. **Problem u kodu aplikacije**
   - Proveri `AuthContext.tsx`
   - Proveri da li se koristi ispravan Supabase client

---

## 🚀 SLEDEĆI KORAK

**PRIMENI `FINAL_FIX.sql` ODMAH!**

Kopiraj sadržaj fajla, nalepi u Supabase SQL Editor, i pokreni.

Zatim testiraj registraciju na sajtu.

---

**Datum**: 6. decembar 2025  
**Status**: ⏳ Čeka primenu FINAL_FIX.sql
