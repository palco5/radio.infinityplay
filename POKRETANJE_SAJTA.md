# 🚀 KAKO POKRENUTI SAJT LOKALNO

## ✅ Šta je Spremno

1. ✅ **PHP API** - Kreiran u `api/` folderu
2. ✅ **MariaDB Schema** - Pokrenuta u Loopia bazi
3. ✅ **Frontend** - Spreman za testiranje

---

## 🎯 OPCIJA 1: Testiranje sa Loopia Bazom (Preporučeno)

Pošto PHP nije instaliran lokalno, možeš testirati direktno sa Loopia serverom:

### 1. Upload API folder na Loopia

```bash
# Koristi FTP da upload-uješ 'api/' folder na Loopia
# FTP Host: ftpcluster.loopia.se
# Username: infinityplay.rs
# Password: Sp/R/d0N0v
```

### 2. Ažuriraj Frontend .env

```bash
# Otvori .env fajl
nano .env
```

Dodaj:
```env
VITE_API_URL=https://radio.infinityplay.rs/api
```

### 3. Pokreni Frontend

Frontend već radi na http://localhost:5173

### 4. Testiraj

Otvori http://localhost:5173 i pokušaj registraciju!

---

## 🎯 OPCIJA 2: Instaliraj PHP Lokalno

### Za macOS:

```bash
# Proveri da li imaš Homebrew
which brew

# Ako nemaš, instaliraj:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instaliraj PHP
brew install php

# Pokreni PHP server
cd /Users/vace/Downloads/project
php -S localhost:8000 -t api
```

Zatim u drugom terminalu:
```bash
# Ažuriraj .env
echo "VITE_API_URL=http://localhost:8000/api" > .env

# Frontend već radi na localhost:5173
```

---

## 🎯 OPCIJA 3: Koristi Online PHP Playground (Brzo Testiranje)

Možeš upload-ovati PHP fajlove na:
- https://www.tehplayground.com (PHP Playground)
- https://phpsandbox.io (PHP Sandbox)

---

## ✅ PREPORUČENI NAČIN - Upload na Loopia

Pošto imaš FTP pristup, **najbrže je da upload-uješ API folder na Loopia**:

### Koraci:

1. **Otvori FTP klijent** (FileZilla, Cyberduck, ili Terminal)

2. **Konektuj se na Loopia FTP**:
   - Host: `ftpcluster.loopia.se`
   - Username: `infinityplay.rs`
   - Password: `Sp/R/d0N0v`

3. **Upload `api/` folder** u root direktorijum

4. **Testiraj API**:
   ```bash
   curl https://radio.infinityplay.rs/api/health
   ```

5. **Ažuriraj frontend .env**:
   ```env
   VITE_API_URL=https://radio.infinityplay.rs/api
   ```

6. **Testiraj sajt** na http://localhost:5173

---

## 🧪 Testiranje

### Test 1: Health Check
```bash
curl https://radio.infinityplay.rs/api/health
```

Očekivano:
```json
{
  "status": "OK",
  "message": "InfinityPlay Radio API is running!",
  "timestamp": "2025-12-07 12:40:00"
}
```

### Test 2: Registracija
Otvori http://localhost:5173 i pokušaj da se registruješ!

---

## 📁 Struktura API Foldera

```
api/
├── config.php         - Database config + JWT functions
├── auth.php           - Register/Login/Me
├── stations.php       - Get stations
├── profiles.php       - Get/Update profile
├── favorites.php      - Get/Add/Remove favorites
├── health.php         - Health check
└── .htaccess          - URL rewriting
```

---

## 🆘 Ako Imaš Problema

### Problem: CORS greška
**Rešenje**: Proveri da li je `CORS_ORIGIN` u `api/config.php` podešen na `https://radio.infinityplay.rs`

### Problem: Database connection failed
**Rešenje**: Proveri database credentials u `api/config.php`:
- Host: `mysql462.loopia.se`
- Database: `infinityplay_rs_db_1`
- User: `infinity@i77893`
- Password: `Racivaci5!`

---

## 🚀 Sledeći Koraci

1. **Upload API na Loopia** (preko FTP)
2. **Testiraj API** (curl health endpoint)
3. **Ažuriraj frontend .env**
4. **Testiraj registraciju** na localhost:5173
5. **Build i deploy frontend** na Loopia

---

**Javi mi kada upload-uješ API folder i testiram zajedno sa tobom!** 🚀
