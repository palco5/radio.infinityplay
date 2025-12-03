# 🚀 Brzo Uputstvo - InfinityPlay Radio

## 🎯 Šta je novo?

### 1. ✨ Bolji Crossfade
- **800ms** fade out (umesto 500ms)
- **1000ms** fade in (umesto 700ms)
- **Eksponencijalna kriva** za prirodniji zvuk
- **30 koraka** umesto 20 za ultra-glatke prelaze

### 2. 🗄️ Supabase Baza
- Svi podaci sada u Supabase
- Real-time sync između korisnika
- Automatski backup
- Spreman za production

### 3. 🔗 InfinityPlay.rs Linkovi
- Svi linkovi vode na infinityplay.rs
- Footer ažuriran sa novim linkovima

### 4. 🚀 Automatski Deployment
- Push kod → Automatski build → Live za 2-3 minuta
- GitHub Actions sve radi umesto tebe

---

## 📋 Kako Podesiti Supabase?

### Korak 1: Otvori Supabase Dashboard
👉 https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit

### Korak 2: Kreiraj Tabele
1. Klikni na **SQL Editor** (levo u meniju)
2. Klikni **New Query**
3. Otvori fajl `supabase/schema.sql` u projektu
4. Kopiraj **SVE** iz tog fajla
5. Paste u SQL Editor
6. Klikni **Run** (ili pritisni Ctrl+Enter)

### Korak 3: Proveri Tabele
1. Klikni na **Table Editor** (levo u meniju)
2. Trebalo bi da vidiš:
   - ✅ profiles
   - ✅ stations
   - ✅ favorites
   - ✅ listening_sessions

### Korak 4: Testiranje
```bash
npm run dev
```
Otvori http://localhost:5173 i testuj!

---

## 🚀 Kako Podesiti Automatski Deployment?

### Korak 1: Kreiraj GitHub Repo
```bash
git init
git add .
git commit -m "Initial commit - InfinityPlay Radio"
git remote add origin https://github.com/TVOJE-IME/infinityplay-radio.git
git push -u origin main
```

### Korak 2: Dodaj Secrets
1. Idi na GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Klikni **New repository secret**
4. Dodaj:

**Secret 1:**
```
Name: VITE_SUPABASE_URL
Value: https://huyiaierkscuhxlvvtit.supabase.co
```

**Secret 2:**
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA
```

### Korak 3: Omogući GitHub Pages
1. **Settings** → **Pages**
2. **Source**: Izaberi **GitHub Actions**
3. Sačekaj ~2 minuta

### Korak 4: Proveri Deployment
1. Idi na **Actions** tab
2. Vidi da li je deployment uspešan (zelena ✅)
3. Tvoj sajt je live na: `https://TVOJE-IME.github.io/infinityplay-radio/`

---

## 🌐 Custom Domain (infinityplay.rs)

### DNS Podešavanja
U DNS podešavanjima za infinityplay.rs:

```
Type: A
Name: @
Value: 185.199.108.153

Type: A
Name: @
Value: 185.199.109.153

Type: A
Name: @
Value: 185.199.110.153

Type: A
Name: @
Value: 185.199.111.153

Type: CNAME
Name: www
Value: TVOJE-IME.github.io
```

### GitHub Pages Custom Domain
1. **Settings** → **Pages**
2. **Custom domain**: `infinityplay.rs`
3. ✅ **Enforce HTTPS**

---

## 🔄 Kako Raditi Dalje?

### Svaki put kada hoćeš da promeniš nešto:

1. **Promeni kod lokalno**
   ```bash
   npm run dev
   # Testuj na http://localhost:5173
   ```

2. **Commit i push**
   ```bash
   git add .
   git commit -m "Opis izmena"
   git push
   ```

3. **Automatski deployment**
   - GitHub Actions build-uje projekat
   - Deploy-uje na infinityplay.rs
   - **Live za 2-3 minuta!** 🎉

---

## 🎵 Kako Testirati Crossfade?

### Test 1: Promena Stanica
1. Pokreni aplikaciju
2. Uloguj se (test@gmail.com / 123456)
3. Pusti stanicu
4. Čekaj 2-3 sekunde
5. Promeni stanicu
6. **Slušaj glatki crossfade!** ✨

### Test 2: Džingl
1. Uloguj se kao admin (darkospira@gmail.com / Racivaci5!)
2. Idi u Admin Panel
3. Klikni Edit na nekom korisniku
4. Dodaj Jingle URL (npr: https://example.com/jingle.mp3)
5. Postavi interval (npr: 1 minut za brže testiranje)
6. Pusti stanicu kao taj korisnik
7. **Čekaj i slušaj džingl sa crossfade-om!** 🎶

---

## 📊 Real-Time Funkcionalnosti

### Kako testirati:

1. **Otvori 2 browser-a** (ili 2 tab-a)
2. **Browser 1**: Uloguj se kao admin
3. **Browser 2**: Uloguj se kao običan korisnik
4. **Browser 1**: Promeni stanicu u admin panelu
5. **Browser 2**: Vidi promenu **ODMAH** bez refresh-a! 🚀

---

## 🐛 Problemi?

### Build greška?
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Supabase ne radi?
1. Proveri da li si pokrenuo SQL skriptu
2. Proveri API ključeve u `.env`
3. Proveri da li su tabele kreirane u Supabase Dashboard

### Deployment ne radi?
1. Proveri GitHub Secrets
2. Proveri **Actions** tab za greške
3. Proveri da li je GitHub Pages omogućen

---

## 📞 Kontakt

- 📧 Email: darkospira@gmail.com
- 🌐 Website: infinityplay.rs

---

## ✅ Checklist

Pre nego što kreneš:

- [ ] Supabase tabele kreirane
- [ ] GitHub repo kreiran
- [ ] GitHub Secrets dodati
- [ ] GitHub Pages omogućen
- [ ] Lokalno testiranje radi
- [ ] Crossfade testiran
- [ ] Džingl testiran
- [ ] Real-time testiran

---

## 🎉 Gotovo!

Sada imaš:
- ✅ Ultra-glatki crossfade
- ✅ Supabase bazu
- ✅ Automatski deployment
- ✅ Real-time sync
- ✅ Custom domain ready

**Push kod i budi live za 2-3 minuta!** 🚀

---

**Srećno! 🎵**
