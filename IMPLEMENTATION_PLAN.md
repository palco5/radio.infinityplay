# Plan Implementacije - 6 Zahteva

## 1. Upload slike za istaknute stanice ✅
- **Fajlovi**: `AddStationModal.tsx`, `EditStationModal.tsx`, `StationsSection.tsx`
- **Izmene**:
  - Dodati input polje za upload slike (logo_url)
  - Omogućiti preview slike
  - Slika treba da pokrije ceo prostor (object-cover umesto object-contain)
  - Dodati validaciju za slike

## 2. Scroll na vrh + Fiksiranje "Odaberite vaš paket" + Dinamički paketi + Tajmer za trial ✅
- **Fajlovi**: `PaymentPage.tsx`, `PricingSection.tsx`, `TrialStatus.tsx`
- **Izmene**:
  - Dodati `useEffect` sa `window.scrollTo(0, 0)` u PaymentPage
  - Popraviti pozicioniranje naslova "Odaberite vaš paket"
  - Koristiti podatke za Srbiju (Bitrejt d.o.o.)
  - Omogućiti dinamički izbor paketa
  - Ažurirati cenu, naziv i detalje kada korisnik promeni paket
  - Dodati jednostavan tajmer pored subscription tier-a za trial period

## 3. Admin može dodati FREE paket korisniku ✅
- **Fajlovi**: `AdminDashboard.tsx`, novi modal `AssignFreePlanModal.tsx`
- **Izmene**:
  - Dodati dugme/opciju u admin panelu za dodelu free paketa
  - Kreirati modal za izbor korisnika i dodelu free paketa
  - Ažurirati subscription_tier na 'free'

## 4. Prikazati naziv pretplate u "Moja Pretplata" ✅
- **Fajlovi**: `SubscriptionManagement.tsx`
- **Izmene**:
  - Prikazati čitljiv naziv paketa (BASIC RADIO, BRANDED RADIO, HOST RADIO)
  - Dodati više detalja o pretplati

## 5. Popraviti pozicioniranje "NAJPOPULARNIJI" teksta ✅
- **Fajlovi**: `PricingSection.tsx`
- **Izmene**:
  - Proveriti i popraviti pozicioniranje badge-a
  - Proveriti da li ima još sličnih problema

## 6. Direktno prebacivanje na registraciju bez modal-a ✅
- **Fajlovi**: `StationsSection.tsx`, `Navbar.tsx`
- **Izmene**:
  - Ukloniti modal za zaključane stanice
  - Direktno otvoriti AuthModal sa register tab-om
  - Popraviti grešku sa "Prijavi se" i "Registruj se" dugmićima
