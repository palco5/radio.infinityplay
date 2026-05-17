# 🚀 MIGRACIJA NA LOOPIA - Kompletno Uputstvo

## ✅ Šta je Urađeno

### 1. Uklonjeno
- ❌ `.github/` folder (GitHub Actions)
- ❌ `vercel.json` (Vercel config)
- ❌ `supabase/` folder (Supabase SQL skripte)
- ❌ `@supabase/supabase-js` dependency
- ❌ `resend` dependency

### 2. Kreirano
- ✅ `backend/` - Node.js/Express server sa MariaDB
- ✅ `database/mariadb_schema.sql` - MariaDB database schema
- ✅ `src/lib/api.ts` - Novi API client (zamenjuje Supabase)
- ✅ `.env.example` - Environment variables template

---

## 📋 POTREBNI PODACI OD LOOPIA

Molim te, pošalji mi sledeće informacije:

### 1. MariaDB Database Info
- **Database Server** (host): _____________________
- **Database Name**: _____________________
- **Username**: _____________________
- **Password**: _____________________
- **Port**: 3306 (default)

### 2. FTP Info (za deployment)
- **FTP Host**: _____________________
- **FTP Username**: _____________________
- **FTP Password**: _____________________
- **FTP Port**: 21 (default)

### 3. Domain
- **Domain**: radio.infinityplay.rs ✅

### 4. Hosting Detalji
- Da li Loopia podržava Node.js aplikacije? (DA/NE)
- Ako DA, koja verzija Node.js?
- Da li imaš SSH pristup? - imam

---

## 🗄️ KORAK 1: Setup MariaDB Baze

### 1.1 Uloguj se u phpMyAdmin
- Idi na Loopia phpMyAdmin
- Uloguj se sa username i password

### 1.2 Kreiraj Bazu (ako već nije kreirana)
- Klikni "New" ili "Nova baza"
- Unesi ime baze
- Charset: `utf8mb4_unicode_ci`

### 1.3 Pokreni SQL Skriptu
1. Otvori fajl: `/Users/vace/Downloads/project/database/mariadb_schema.sql`
2. Kopiraj **SVE** iz fajla
3. U phpMyAdmin, idi na tab "SQL"
4. Nalepi skriptu
5. Klikni "Go" ili "Izvrši"

**Očekivano**: Trebalo bi da vidiš 4 tabele:
- `profiles`
- `stations`
- `favorites`
- `listening_sessions`

---

## ⚙️ KORAK 2: Konfiguriši Backend

### 2.1 Kreiraj `.env` Fajl

```bash
cd /Users/vace/Downloads/project/backend
cp .env.example .env
nano .env
```

### 2.2 Popuni `.env` Sa Loopia Podacima

```env
PORT=3001
NODE_ENV=production

# MariaDB Database (Loopia)
DB_HOST=tvoj_database_server_ovde
DB_PORT=3306
DB_NAME=tvoje_ime_baze
DB_USER=tvoj_username
DB_PASSWORD=tvoja_lozinka

# JWT Secret (promeni ovo!)
JWT_SECRET=neki_random_secret_key_12345

# CORS
CORS_ORIGIN=https://radio.infinityplay.rs
```

### 2.3 Instaliraj Dependencies

```bash
cd /Users/vace/Downloads/project/backend
npm install
```

### 2.4 Testiraj Backend Lokalno

```bash
npm run dev
```

**Očekivano**:
```
🚀 Server running on http://localhost:3001
✅ Connected to MariaDB database
```

### 2.5 Testiraj API

```bash
# Health check
curl http://localhost:3001/api/health

# Test registracije
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

---

## 🎨 KORAK 3: Konfiguriši Frontend

### 3.1 Kreiraj `.env` Fajl

```bash
cd /Users/vace/Downloads/project
cp .env.example .env
nano .env
```

### 3.2 Popuni `.env`

**Za lokalno testiranje:**
```env
VITE_API_URL=http://localhost:3001/api
```

**Za produkciju (nakon deployment-a):**
```env
VITE_API_URL=https://radio.infinityplay.rs/api
```

### 3.3 Ukloni Stare Dependencies i Instaliraj Nove

```bash
cd /Users/vace/Downloads/project
rm -rf node_modules package-lock.json
npm install
```

### 3.4 Build Frontend

```bash
npm run build
```

---

## 🚀 KORAK 4: Deployment na Loopia

### Opcija A: Ako Loopia Podržava Node.js

1. Upload `backend/` folder preko FTP
2. Upload `dist/` folder (frontend build) preko FTP
3. Na serveru, pokreni:
```bash
cd backend
npm install --production
node server.js
```

### Opcija B: Ako Loopia NE Podržava Node.js

Moraš koristiti **eksterni hosting za backend**:
- Heroku (besplatno)
- Railway (besplatno)
- Render (besplatno)
- DigitalOcean ($5/mesec)

Zatim:
1. Deploy backend na eksterni hosting
2. Ažuriraj `VITE_API_URL` u frontend `.env`
3. Rebuild frontend: `npm run build`
4. Upload `dist/` folder na Loopia preko FTP

---

## 📤 KORAK 5: FTP Upload

### 5.1 Kreiraj FTP Upload Skriptu

Već imaš `scripts/upload-to-loopia.js` - samo treba da ažuriraš FTP podatke.

### 5.2 Upload Frontend

```bash
npm run deploy
```

Ovo će:
1. Build-ovati frontend (`npm run build`)
2. Upload-ovati `dist/` folder na Loopia preko FTP

---

## 🧪 KORAK 6: Testiranje

### 6.1 Testiraj Backend API

```bash
curl https://radio.infinityplay.rs/api/health
```

### 6.2 Testiraj Frontend

Otvori: https://radio.infinityplay.rs

1. Pokušaj registraciju
2. Pokušaj login
3. Testiraj slušanje radio stanica

---

## 🔄 MIGRACIJA PODATAKA (Opciono)

Ako imaš postojeće podatke u Supabase-u:

### 1. Eksportuj iz Supabase
```sql
-- U Supabase SQL Editor-u
SELECT * FROM profiles;
SELECT * FROM stations;
SELECT * FROM favorites;
```

### 2. Importuj u MariaDB
- Kopiraj podatke
- Prilagodi format (UUID → VARCHAR)
- Importuj preko phpMyAdmin

---

## 📝 SLEDEĆI KORACI

1. **Pošalji mi Loopia podatke** (database, FTP)
2. **Pokreni MariaDB skriptu** u phpMyAdmin
3. **Konfiguriši backend** `.env` fajl
4. **Testiraj lokalno**
5. **Deploy na Loopia**

---

## 🆘 Pomoć

Ako imaš problema, pošalji mi:
- Screenshot greške
- Loopia hosting plan detalje
- Da li Loopia podržava Node.js

---

**Čekam tvoje Loopia podatke da nastavimo!** 🚀
