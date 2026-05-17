# 🚀 InfinityPlay Radio - Backend Server

Backend server za InfinityPlay Radio platformu - **BEZ Supabase-a!**

Koristi **Node.js + Express + PostgreSQL** umesto Supabase-a.

---

## 📋 Preduslov

Potrebno je da imaš instaliran:
- **Node.js** (v18 ili noviji)
- **PostgreSQL** (v14 ili noviji)

---

## 🛠️ Setup - Korak po Korak

### 1. Instaliraj PostgreSQL

#### macOS (Homebrew):
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Ili koristi postojeću Supabase PostgreSQL bazu:
Možeš koristiti istu bazu iz Supabase-a, samo bez RLS-a!

---

### 2. Kreiraj Bazu Podataka

```bash
# Uloguj se u PostgreSQL
psql postgres

# Kreiraj bazu
CREATE DATABASE infinityplay_radio;

# Izađi
\q
```

---

### 3. Pokreni SQL Skriptu

```bash
# Pokreni database.sql skriptu
psql infinityplay_radio < database.sql
```

**ILI** ako koristiš Supabase bazu:
- Otvori `database.sql`
- Kopiraj sadržaj
- Nalepi u Supabase SQL Editor
- Pokreni

---

### 4. Konfiguriši Environment Variables

```bash
# Kopiraj .env.example u .env
cp .env.example .env

# Uredi .env fajl
nano .env
```

**Podesi ove vrednosti:**
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=infinityplay_radio
DB_USER=postgres
DB_PASSWORD=tvoja_lozinka
JWT_SECRET=neki_random_secret_key
CORS_ORIGIN=http://localhost:5173
```

**Ako koristiš Supabase bazu:**
```env
DB_HOST=db.huyiaierkscuhxlvvtit.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=tvoja_supabase_lozinka
```

---

### 5. Instaliraj Dependencies

```bash
cd backend
npm install
```

---

### 6. Pokreni Server

```bash
# Development mode (sa auto-restart)
npm run dev

# Production mode
npm start
```

Server će biti dostupan na: **http://localhost:3001**

---

## 🧪 Testiranje

### Health Check
```bash
curl http://localhost:3001/api/health
```

Očekivano:
```json
{
  "status": "OK",
  "message": "InfinityPlay Backend is running!"
}
```

### Test Registracije
```bash
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

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Registracija
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires token)

### Stations
- `GET /api/stations` - Get all stations
- `GET /api/stations/:id` - Get single station

### Profiles
- `GET /api/profiles/:id` - Get user profile (requires token)
- `PUT /api/profiles/:id` - Update profile (requires token)

### Favorites
- `GET /api/favorites` - Get user favorites (requires token)
- `POST /api/favorites` - Add favorite (requires token)
- `DELETE /api/favorites/:station_id` - Remove favorite (requires token)

---

## 🔄 Migracija sa Supabase-a

### Opcija 1: Koristi Supabase Bazu (Preporučeno)
Možeš koristiti istu PostgreSQL bazu iz Supabase-a:

1. Uzmi connection string iz Supabase Dashboard
2. Podesi u `.env`:
```env
DB_HOST=db.huyiaierkscuhxlvvtit.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=tvoja_supabase_lozinka
```

3. Dodaj `password` kolonu u `profiles` tabelu:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;
```

### Opcija 2: Nova Lokalna Baza
Koristi `database.sql` skriptu da kreiraš novu lokalnu bazu.

---

## 🔐 Sigurnost

- ✅ Passwords se hashuju sa bcrypt
- ✅ JWT tokens za autentifikaciju
- ✅ CORS zaštita
- ✅ SQL injection zaštita (parametrizovani query-ji)
- ❌ **NEMA RLS-a** - sve se kontroliše u backend kodu!

---

## 🐛 Troubleshooting

### "Connection refused" greška
- Proveri da li je PostgreSQL pokrenut
- Proveri DB_HOST i DB_PORT u `.env`

### "Password authentication failed"
- Proveri DB_PASSWORD u `.env`
- Proveri da li korisnik postoji u PostgreSQL

### "Cannot find module"
- Pokreni `npm install` ponovo

---

## 📝 Sledeći Koraci

Nakon što pokreneš backend:

1. **Ažuriraj frontend** da koristi novi backend umesto Supabase-a
2. **Testiraj registraciju** na http://localhost:5173
3. **Testiraj login** i ostale funkcionalnosti

---

## 🎉 Gotovo!

Backend server je spreman! Sada možeš koristiti aplikaciju **bez Supabase-a**! 🚀
