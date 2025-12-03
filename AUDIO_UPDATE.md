# 🎵 Audio & Jingle Update - Šta je Novo?

## 1. 🎧 Dual-Deck Crossfade

Implementirao sam pravi "broadcast" crossfade sistem:

- **Kako radi:** Koristimo dva audio plejera ("deck-a") istovremeno.
- **Promena stanice:**
  1. Stara stanica se stišava (Fade Out 1.5s)
  2. Nova stanica se pojačava (Fade In 1.5s)
  3. **Rezultat:** Obe stanice se čuju istovremeno 1.5 sekundi, stvarajući savršen prelaz bez tišine.

## 2. 📢 Jingle Sistem

Potpuno nova logika za džinglove:

- **Bez pauziranja:** Stanica se više ne pauzira, već se samo stiša.
- **Crossfade:**
  - **Početak:** Stanica Fade Out (1.5s) + Džingl Fade In (1.5s)
  - **Kraj:** Džingl Fade Out (1.5s) + Stanica Fade In (1.5s)
- **Rezultat:** Džingl se "utapa" u program, baš kao na pravom radiju.

## 3. 💾 Jingle Upload Fix

Popravljen problem sa dugmetom "Sačuvaj":

- **Limit:** Dodato ograničenje od 3MB za upload fajlova (zbog localStorage limita).
- **Validacija:** Ako je fajl preveliki, dobićete upozorenje.
- **Preporuka:** Za veće fajlove ili bolji kvalitet, koristite direktan URL (npr. uploadujte na Dropbox/Google Drive i kopirajte link).

---

## 🛠️ Tehnički Detalji

### AudioContext (`src/contexts/AudioContext.tsx`)
- Dodat `audioRef1` i `audioRef2`
- Dodat `activeDeckRef`
- Nova `playJingle` funkcija sa `Promise.all` za paralelni fade

### AudioPlayer (`src/components/player/AudioPlayer.tsx`)
- Uklonjena lokalna jingle logika
- Sada koristi `playJingle` iz context-a

### EditUserModal (`src/components/admin/EditUserModal.tsx`)
- Dodata provera `file.size > 3MB`
- Dodat `try-catch` za `QuotaExceededError`

---

## 🚀 Kako Testirati

1. **Crossfade Stanica:**
   - Pusti stanicu A
   - Klikni na stanicu B
   - Slušaj prelaz (treba da se čuju obe 1.5s)

2. **Džingl:**
   - Uloguj se kao admin
   - Edituj korisnika
   - Ubaci džingl (URL ili manji fajl)
   - Pusti stanicu
   - Čekaj interval (ili smanji na 1 min za test)
   - Slušaj prelaz (stanica se ne gasi, samo stišava)

3. **Upload:**
   - Probaj da ubaciš veliki fajl (>3MB) -> Treba da dobiješ grešku
   - Probaj mali fajl -> Treba da radi "Sačuvaj"

---

**Uživaj u novom zvuku! 🎵**
