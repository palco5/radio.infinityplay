# 🚀 Real-Time Deployment Guide - InfinityPlay Radio

Ovaj vodič će ti pokazati kako da postaviš **automatski deployment** tako da svaka promena koda odmah bude vidljiva na sajtu.

## 📋 Pregled

Koristićemo **GitHub Pages** sa **GitHub Actions** za automatski deployment. Svaki put kada push-uješ kod na GitHub, sajt će se automatski build-ovati i deploy-ovati.

---

## 🔧 Korak 1: Priprema Projekta

### 1.1 Dodaj `base` u Vite config

Otvori `vite.config.ts` i dodaj:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Ako koristiš custom domain
  // base: '/repository-name/', // Ako koristiš GitHub Pages bez custom domaina
});
```

### 1.2 Kreiraj `.env` fajl

```bash
VITE_SUPABASE_URL=https://huyiaierkscuhxlvvtit.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA
```

**NAPOMENA:** Ne commit-uj `.env` fajl! On je već u `.gitignore`.

---

## 🐙 Korak 2: GitHub Setup

### 2.1 Kreiraj GitHub Repository

```bash
# Inicijalizuj git (ako već nije)
git init

# Dodaj sve fajlove
git add .

# Commit
git commit -m "Initial commit - InfinityPlay Radio"

# Dodaj remote (zameni sa svojim repo-om)
git remote add origin https://github.com/tvoje-ime/infinityplay-radio.git

# Push na GitHub
git push -u origin main
```

### 2.2 Podesi GitHub Secrets

1. Idi na GitHub repository
2. Settings → Secrets and variables → Actions
3. Dodaj sledeće secrets:

```
VITE_SUPABASE_URL = https://huyiaierkscuhxlvvtit.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA
```

### 2.3 Omogući GitHub Pages

1. Settings → Pages
2. Source: **GitHub Actions**
3. Sačekaj da se prvi deployment završi

---

## 🌐 Korak 3: Custom Domain (infinityplay.rs)

### 3.1 DNS Podešavanja

U DNS podešavanjima za `infinityplay.rs`, dodaj:

```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153

Type: CNAME
Name: www
Value: tvoje-ime.github.io
```

### 3.2 GitHub Pages Custom Domain

1. Settings → Pages
2. Custom domain: `infinityplay.rs`
3. Enforce HTTPS: ✅

---

## ⚡ Korak 4: Automatski Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) je već kreiran!

### Kako radi:

1. **Push kod na GitHub:**
   ```bash
   git add .
   git commit -m "Dodao novu funkcionalnost"
   git push
   ```

2. **GitHub Actions automatski:**
   - Instalira dependencies
   - Build-uje projekat
   - Deploy-uje na GitHub Pages

3. **Sajt se ažurira za ~2-3 minuta!** 🎉

### Proveri Status

- Idi na **Actions** tab u GitHub repo
- Vidi progress deployment-a
- Zelena ✅ = uspešno
- Crvena ❌ = greška (proveri logove)

---

## 🗄️ Korak 5: Supabase Setup

### 5.1 Kreiraj Tabele

1. Idi na [Supabase Dashboard](https://supabase.com/dashboard/project/huyiaierkscuhxlvvtit)
2. SQL Editor → New Query
3. Kopiraj sadržaj iz `supabase/schema.sql`
4. Run query

### 5.2 Proveri Tabele

Trebalo bi da vidiš:
- ✅ `profiles`
- ✅ `stations`
- ✅ `favorites`
- ✅ `listening_sessions`

---

## 🔄 Real-Time Funkcionalnosti

### Šta radi u real-time:

1. **Promene stanica** - Odmah vidljive svim korisnicima
2. **Promene profila** - Admin promene odmah vidljive
3. **Listener count** - Real-time brojač slušalaca
4. **Favoriti** - Instant sync između uređaja

### Kako testirati:

1. Otvori sajt u 2 browser-a
2. Uloguj se kao admin u jednom
3. Promeni stanicu u admin panelu
4. Promene će biti vidljive u drugom browser-u **odmah**!

---

## 📊 Monitoring & Analytics

### GitHub Actions

- **Actions** tab pokazuje sve deployment-e
- Klikni na deployment za detalje
- Vidi build logove i greške

### Supabase Dashboard

- **Database** → Proveri podatke
- **Authentication** → Vidi korisnike
- **Logs** → Debug probleme
- **API** → Proveri API calls

---

## 🛠️ Česte Komande

### Lokalni Development

```bash
# Pokreni dev server
npm run dev

# Build za production
npm run build

# Preview production build
npm run preview
```

### Git Workflow

```bash
# Proveri status
git status

# Dodaj sve izmene
git add .

# Commit sa porukom
git commit -m "Opis izmena"

# Push na GitHub (automatski deployment)
git push

# Vidi logove
git log --oneline
```

### Troubleshooting

```bash
# Očisti node_modules i reinstaliraj
rm -rf node_modules package-lock.json
npm install

# Očisti build folder
rm -rf dist

# Force rebuild
npm run build
```

---

## 🎯 Workflow Primer

### Scenario: Dodaješ novu stanicu

1. **Lokalno:**
   ```bash
   # Pokreni dev server
   npm run dev
   
   # Otvori http://localhost:5173
   # Uloguj se kao admin
   # Dodaj stanicu kroz admin panel
   ```

2. **Commit & Push:**
   ```bash
   git add .
   git commit -m "Dodao novu stanicu - Infinity Techno"
   git push
   ```

3. **Automatski:**
   - GitHub Actions build-uje projekat
   - Deploy-uje na infinityplay.rs
   - Za 2-3 minuta, nova stanica je live! 🚀

---

## 🔒 Security Best Practices

### Environment Variables

- ✅ Koristi GitHub Secrets za API ključeve
- ✅ Nikad ne commit-uj `.env` fajl
- ✅ Koristi Supabase RLS (Row Level Security)

### Supabase

- ✅ Koristi `anon` key za frontend
- ✅ Koristi `service_role` key samo u backend-u
- ✅ Podesi RLS policies za sve tabele

---

## 📱 Mobile & Desktop Testing

### Responsive Design

Sajt je optimizovan za:
- 📱 Mobile (320px+)
- 💻 Tablet (768px+)
- 🖥️ Desktop (1024px+)

### Browser Testing

Testiraj na:
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers

---

## 🎉 Gotovo!

Sada imaš:
- ✅ Automatski deployment
- ✅ Real-time sync sa Supabase
- ✅ Custom domain (infinityplay.rs)
- ✅ Crossfade audio transitions
- ✅ Džingl sistem
- ✅ Admin panel
- ✅ Trial period sistem

### Svaka promena koda = Automatski live za 2-3 minuta! 🚀

---

## 📞 Podrška

Ako imaš pitanja:
- 📧 Email: darkospira@gmail.com
- 🌐 Website: infinityplay.rs

**Srećno! 🎵**
