# Tehnička Dokumentacija - localStorage Implementacija

## Arhitektura

### localStorage Servis (`/src/lib/localStorage.ts`)

Centralni servis koji upravlja svim podacima aplikacije kroz browser localStorage API.

## API Referenca

### localAuth

Servis za autentifikaciju i upravljanje korisnicima.

#### `signUp(email: string, password: string)`

Registruje novog korisnika.

**Parametri:**
- `email` - Email adresa korisnika
- `password` - Lozinka (minimum 6 karaktera)

**Vraća:**
```typescript
{
  user: LocalUser,
  profile: UserProfile
}
```

**Greške:**
- `"Korisnik sa ovim email-om već postoji"` - Email već registrovan

**Primer:**
```typescript
try {
  const { user, profile } = await localAuth.signUp(
    'user@example.com',
    'password123'
  );
  console.log('Registrovan:', user.id);
} catch (error) {
  console.error(error.message);
}
```

#### `signIn(email: string, password: string)`

Prijavljuje postojećeg korisnika.

**Parametri:**
- `email` - Email adresa
- `password` - Lozinka

**Vraća:**
```typescript
{
  user: LocalUser,
  profile: UserProfile | undefined
}
```

**Greške:**
- `"Pogrešan email ili lozinka"` - Neispravni kredencijali

**Primer:**
```typescript
try {
  const { user, profile } = await localAuth.signIn(
    'user@example.com',
    'password123'
  );
  console.log('Ulogovan:', profile?.display_name);
} catch (error) {
  console.error(error.message);
}
```

#### `signOut()`

Odjavljuje trenutnog korisnika.

**Primer:**
```typescript
await localAuth.signOut();
```

#### `getCurrentUser()`

Vraća trenutno ulogovanog korisnika.

**Vraća:**
```typescript
LocalUser | null
```

**Primer:**
```typescript
const user = localAuth.getCurrentUser();
if (user) {
  console.log('Ulogovan kao:', user.email);
}
```

#### `getProfile(userId: string)`

Vraća profil korisnika po ID-u.

**Parametri:**
- `userId` - ID korisnika

**Vraća:**
```typescript
UserProfile | null
```

**Primer:**
```typescript
const profile = localAuth.getProfile('user-123');
if (profile) {
  console.log('Profil:', profile.display_name);
}
```

#### `updateProfile(userId: string, updates: Partial<UserProfile>)`

Ažurira profil korisnika.

**Parametri:**
- `userId` - ID korisnika
- `updates` - Parcijalni update objekta profila

**Vraća:**
```typescript
UserProfile | null
```

**Primer:**
```typescript
const updated = localAuth.updateProfile('user-123', {
  display_name: 'Novo Ime',
  theme_preference: 'dark'
});
```

---

### localStations

Servis za upravljanje radio stanicama.

#### `getAll()`

Vraća sve radio stanice.

**Vraća:**
```typescript
RadioStation[]
```

**Primer:**
```typescript
const stations = localStations.getAll();
console.log(`Ukupno stanica: ${stations.length}`);
```

#### `getActive()`

Vraća samo aktivne radio stanice.

**Vraća:**
```typescript
RadioStation[]
```

**Primer:**
```typescript
const activeStations = localStations.getActive();
```

#### `getById(id: string)`

Vraća stanicu po ID-u.

**Parametri:**
- `id` - ID stanice

**Vraća:**
```typescript
RadioStation | null
```

**Primer:**
```typescript
const station = localStations.getById('1');
if (station) {
  console.log('Stanica:', station.name);
}
```

#### `create(station: Omit<RadioStation, 'id' | 'created_at'>)`

Kreira novu radio stanicu.

**Parametri:**
- `station` - Podaci o stanici (bez id i created_at)

**Vraća:**
```typescript
RadioStation
```

**Primer:**
```typescript
const newStation = localStations.create({
  name: 'Nova Stanica',
  description: 'Opis stanice',
  genre: 'Rock',
  stream_url: 'https://stream.example.com',
  logo_url: 'https://logo.example.com',
  is_active: true,
  // ... ostali obavezni parametri
});
```

#### `update(id: string, updates: Partial<RadioStation>)`

Ažurira postojeću stanicu.

**Parametri:**
- `id` - ID stanice
- `updates` - Parcijalni update objekta stanice

**Vraća:**
```typescript
RadioStation | null
```

**Primer:**
```typescript
const updated = localStations.update('1', {
  name: 'Novo Ime Stanice',
  is_active: false
});
```

#### `delete(id: string)`

Briše stanicu.

**Parametri:**
- `id` - ID stanice

**Vraća:**
```typescript
boolean
```

**Primer:**
```typescript
const deleted = localStations.delete('1');
if (deleted) {
  console.log('Stanica obrisana');
}
```

---

### localFavorites

Servis za upravljanje omiljenim stanicama.

#### `get(userId: string)`

Vraća omiljene stanice korisnika.

**Parametri:**
- `userId` - ID korisnika

**Vraća:**
```typescript
string[] // Array of station IDs
```

**Primer:**
```typescript
const favorites = localFavorites.get('user-123');
console.log(`Omiljenih: ${favorites.length}`);
```

#### `add(userId: string, stationId: string)`

Dodaje stanicu u omiljene.

**Parametri:**
- `userId` - ID korisnika
- `stationId` - ID stanice

**Primer:**
```typescript
localFavorites.add('user-123', 'station-1');
```

#### `remove(userId: string, stationId: string)`

Uklanja stanicu iz omiljenih.

**Parametri:**
- `userId` - ID korisnika
- `stationId` - ID stanice

**Primer:**
```typescript
localFavorites.remove('user-123', 'station-1');
```

#### `toggle(userId: string, stationId: string)`

Toggle-uje stanicu u omiljenim (dodaje ako ne postoji, uklanja ako postoji).

**Parametri:**
- `userId` - ID korisnika
- `stationId` - ID stanice

**Primer:**
```typescript
localFavorites.toggle('user-123', 'station-1');
```

---

### localTheme

Servis za upravljanje podešavanjima teme.

#### `get(userId: string)`

Vraća podešavanja teme korisnika.

**Parametri:**
- `userId` - ID korisnika

**Vraća:**
```typescript
any | null
```

**Primer:**
```typescript
const themeSettings = localTheme.get('user-123');
```

#### `save(userId: string, settings: any)`

Čuva podešavanja teme.

**Parametri:**
- `userId` - ID korisnika
- `settings` - Podešavanja teme

**Primer:**
```typescript
localTheme.save('user-123', {
  theme: 'dark',
  customColors: {...}
});
```

---

## Tipovi

### LocalUser

```typescript
interface LocalUser {
  id: string;
  email: string;
  password: string; // U produkciji bi trebalo biti hash-ovano
  created_at: string;
}
```

### UserProfile

Vidi `/src/types/index.ts` za kompletan interfejs.

Ključna polja:
- `id: string`
- `email: string`
- `display_name: string | null`
- `subscription_status: 'active' | 'inactive' | 'cancelled'`
- `subscription_tier: 'free' | 'ad-free' | 'branded-radio'`
- `theme_preference: 'light' | 'dark'`
- `total_listening_minutes: number`
- `is_admin: boolean`

### RadioStation

Vidi `/src/types/index.ts` za kompletan interfejs.

Ključna polja:
- `id: string`
- `name: string`
- `stream_url: string`
- `genre: string`
- `description: string | null`
- `logo_url: string | null`
- `is_active: boolean`

---

## localStorage Ključevi

### Globalni Ključevi

- `infinity_users` - Lista svih korisnika
- `infinity_profiles` - Lista svih profila
- `infinity_stations` - Lista svih radio stanica
- `infinity_current_user` - Trenutno ulogovan korisnik

### Ključevi po Korisniku

- `infinity_favorites_{userId}` - Omiljene stanice korisnika
- `infinity_theme_settings_{userId}` - Podešavanja teme korisnika

---

## Inicijalizacija

Pri prvom učitavanju, `localStorage.ts` automatski inicijalizuje:

1. **Mock Radio Stanice** - 5 predefinisanih stanica
2. **Admin Korisnik** - `darkospira@gmail.com` / `admin123`

Ova inicijalizacija se dešava samo ako podaci već ne postoje.

---

## Migracija sa Supabase

### Zamenjene Funkcionalnosti

| Supabase | localStorage |
|----------|--------------|
| `supabase.auth.signUp()` | `localAuth.signUp()` |
| `supabase.auth.signIn()` | `localAuth.signIn()` |
| `supabase.auth.signOut()` | `localAuth.signOut()` |
| `supabase.auth.getUser()` | `localAuth.getCurrentUser()` |
| `supabase.from('users_profiles').select()` | `localAuth.getProfile()` |
| `supabase.from('users_profiles').update()` | `localAuth.updateProfile()` |
| `supabase.from('radio_stations').select()` | `localStations.getAll()` |
| `supabase.from('radio_stations').insert()` | `localStations.create()` |
| `supabase.from('radio_stations').update()` | `localStations.update()` |
| `supabase.from('radio_stations').delete()` | `localStations.delete()` |

### Uklonjene Funkcionalnosti

- Realtime listener tracking
- Server-side validacija
- Database triggers
- RPC funkcije
- Email verifikacija
- Password reset

---

## Best Practices

### 1. Error Handling

Uvek koristi try-catch blokove:

```typescript
try {
  await localAuth.signIn(email, password);
} catch (error) {
  console.error('Login failed:', error.message);
  // Prikaži grešku korisniku
}
```

### 2. Provera Autentifikacije

Pre pristupa zaštićenim resursima:

```typescript
const user = localAuth.getCurrentUser();
if (!user) {
  navigate('/login');
  return;
}
```

### 3. Ažuriranje Profila

Koristi parcijalne update-e:

```typescript
localAuth.updateProfile(userId, {
  display_name: 'Novo Ime'
  // Samo polja koja se menjaju
});
```

### 4. Čišćenje Podataka

Za development/testing:

```typescript
// Obriši sve podatke
localStorage.clear();

// Ili specifične ključeve
localStorage.removeItem('infinity_users');
localStorage.removeItem('infinity_stations');
```

---

## Debugging

### Pregled Podataka

U browser konzoli:

```javascript
// Vidi sve ključeve
Object.keys(localStorage);

// Vidi korisnike
JSON.parse(localStorage.getItem('infinity_users'));

// Vidi stanice
JSON.parse(localStorage.getItem('infinity_stations'));

// Vidi trenutnog korisnika
JSON.parse(localStorage.getItem('infinity_current_user'));
```

### Reset Admin Naloga

```javascript
localStorage.removeItem('infinity_users');
localStorage.removeItem('infinity_profiles');
location.reload();
```

---

## Performanse

### Optimizacije

1. **Lazy Loading** - Podaci se učitavaju samo kada su potrebni
2. **Memoization** - Koristi React hooks za keširane podatke
3. **Batch Updates** - Grupišite više update-a

### Ograničenja

- localStorage limit: ~5-10MB (zavisi od browser-a)
- Sinhrone operacije - mogu blokirati UI thread
- Nema indeksiranja - linearna pretraga

### Rešenja za Velike Količine Podataka

Za aplikacije sa mnogo podataka, razmotri:

1. **IndexedDB** - Veći kapacitet, async operacije
2. **Backend API** - Server-side storage
3. **Pagination** - Učitavaj podatke postepeno

---

## Bezbednost

⚠️ **Važno:** localStorage nije siguran za osetljive podatke!

### Trenutna Implementacija

- Lozinke se čuvaju u plain text-u
- Nema enkripcije
- Nema rate limiting-a
- Nema session timeout-a

### Za Produkciju

Implementiraj:

1. **Hash-ovanje lozinki** (bcrypt, argon2)
2. **JWT tokeni** za autentifikaciju
3. **HTTPS** za transport
4. **Rate limiting** protiv brute force napada
5. **Session management** sa timeout-om
6. **Input validacija** na server-u

---

## Testiranje

### Unit Testovi

```typescript
import { localAuth } from './localStorage';

describe('localAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should register new user', async () => {
    const { user } = await localAuth.signUp(
      'test@example.com',
      'password123'
    );
    expect(user.email).toBe('test@example.com');
  });

  it('should login existing user', async () => {
    await localAuth.signUp('test@example.com', 'password123');
    const { user } = await localAuth.signIn(
      'test@example.com',
      'password123'
    );
    expect(user).toBeDefined();
  });
});
```

---

## Troubleshooting

### Problem: Podaci se gube nakon refresh-a

**Rešenje:** Proveri da li browser dozvoljava localStorage. Neki privatni režimi blokiraju localStorage.

### Problem: "QuotaExceededError"

**Rešenje:** localStorage je pun. Obriši stare podatke ili koristi IndexedDB.

### Problem: Lozinka ne radi

**Rešenje:** Proveri da li je lozinka tačna. Za admin nalog: `admin123`

### Problem: Stanice se ne učitavaju

**Rešenje:** Obriši `infinity_stations` i reload stranicu da se reinicijalizuju.

---

## Changelog

### v1.0.0 (2025-11-22)

- ✅ Inicijalna implementacija localStorage servisa
- ✅ Zamena Supabase-a sa lokalnim rešenjem
- ✅ Mock podaci za radio stanice
- ✅ Admin nalog
- ✅ Autentifikacija i autorizacija
- ✅ Praćenje vremena slušanja
- ✅ Theme management

---

**Autor:** Development Team  
**Verzija:** 1.0.0  
**Datum:** 22.11.2025
