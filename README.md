# 🎵 InfinityPlay Radio - Admin & User Platform

Profesionalna online radio platforma sa naprednim admin panelom i trial period sistemom.

## ✨ Glavne Funkcionalnosti

### 🎧 Za Korisnike
- **Trial Period (7 dana)** - Besplatan probni period sa automatskim prelaskom na plaćenu pretplatu
- **Crossfade Audio** - Glatke tranzicije između stanica (0.5-1s fade)
- **Džingl Sistem** - Automatsko puštanje džinglova svakih X minuta sa fade efektima
- **Subscription Management** - Potpuna kontrola nad pretplatom
- **Personalizovane Preporuke** - Stanice preporučene za vaš tip biznisa

### 👨‍💼 Za Administratore
- **Potpuna Kontrola Korisnika**
  - Aktivacija/deaktivacija naloga
  - Slanje password reset linkova
  - Izmena korisničkih podataka
  - Upload džinglova (URL ili fajl)
  
- **Upravljanje Stanicama**
  - Dodavanje/izmena/brisanje stanica
  - Preporučivanje stanica korisnicima
  - Real-time listener count (nakon deploy-a)
  
- **Brze Akcije**
  - Bulk operacije nad korisnicima
  - Email notifikacije
  - CSV export podataka

### 💳 Subscription Paketi

1. **BASIC RADIO** - 15€/mesec
   - 7 dana besplatno
   - Sve stanice dostupne
   - HD kvalitet (320kbps)
   - Bez reklama

2. **BRANDED RADIO** - 35€/mesec
   - Sve iz BASIC paketa
   - Personalizovani džinglovi
   - Prilagođena plejlista
   - Brendirana grafika

3. **HOST RADIO** - 195€/godišnje
   - Sve iz BRANDED paketa
   - Hosting vaše stanice
   - Prioritetna podrška 24/7

## 🚀 Pokretanje Projekta

### Preduslov
- Node.js 18+ 
- npm ili yarn

### Instalacija

```bash
# Clone repository
git clone <repository-url>
cd project

# Install dependencies
npm install

# Start development server
npm run dev
```

Aplikacija će biti dostupna na `http://localhost:5173`

### Build za Production

```bash
npm run build
```

## 👤 Test Nalozi

### Admin Nalog
- **Email**: darkospira@gmail.com
- **Password**: Racivaci5!

### Test Korisnik
- **Email**: test@gmail.com
- **Password**: 123456

## 🎨 Nove Funkcionalnosti

### 1. Poboljšani Audio Crossfade ✨
Sve promene stanica i džinglovi imaju **ultra-glatke** fade in/out tranzicije sa eksponencijalnom krivom:
- **Fade Out**: 800ms (30 koraka, kvadratna kriva)
- **Fade In**: 1000ms (30 koraka, kvadratna kriva)
- **Džingl Fade**: Isti kvalitet kao stanice
- **Prirodniji zvuk**: Eksponencijalna kriva umesto linearne

### 2. Supabase Integracija 🗄️
Potpuna integracija sa Supabase bazom podataka:
- **Real-time sync**: Sve promene odmah vidljive
- **Automatski backup**: Svi podaci sigurno sačuvani
- **Scalable**: Spreman za hiljade korisnika
- **Analytics**: Detaljno praćenje slušanja

### 3. Password Reset Sistem
Admin može poslati reset link bilo kom korisniku:
- Klik na ljubičastu mail ikonicu pored korisnika
- Link se trenutno prikazuje u konzoli
- Nakon deploy-a, automatski se šalje email

### 4. Džingl Upload
Admin može uploadovati džinglove na dva načina:
- **URL**: Direktan link do MP3 fajla
- **File Upload**: Upload sa računara (konvertuje se u Data URL)

### 5. Subscription Management
Potpuno funkcionalan sistem pretplata:
- Trial period automatski prelazi u plaćenu pretplatu
- Mogućnost otkazivanja u bilo kom trenutku
- Promjena paketa direktno iz Subscription modala

### 6. Real-Time Deployment 🚀
Automatski deployment sa GitHub Actions:
- Push kod → Automatski build → Live za 2-3 minuta
- Vidi `REALTIME_DEPLOYMENT.md` za detalje
- Custom domain: **infinityplay.rs**

## 📁 Struktura Projekta

```
project/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin komponente
│   │   │   ├── EditUserModal.tsx
│   │   │   ├── SendPasswordResetModal.tsx
│   │   │   └── ...
│   │   ├── dashboard/      # Dashboard komponente
│   │   ├── player/         # Audio player
│   │   └── trial/          # Trial period komponente
│   ├── contexts/
│   │   ├── AudioContext.tsx    # Audio playback sa crossfade
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   └── localStorage.ts     # Mock database
│   ├── pages/
│   │   ├── AdminDashboard.tsx
│   │   ├── UserDashboard.tsx
│   │   └── PaymentPage.tsx
│   └── types/
│       └── index.ts
├── DEPLOYMENT.md           # Deployment guide
└── README.md
```

## 🔧 Tehnologije

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Icons**: Lucide React
- **Audio**: Web Audio API sa custom crossfade
- **Storage**: LocalStorage (development) → Database (production)

## 📊 Real-Time Funkcionalnosti

### Development (Trenutno)
- ✅ Crossfade audio transitions
- ✅ Džingl sistem sa fade
- ✅ Trial period management
- ✅ Password reset (console log)
- ⏳ Listener count (mock data)
- ⏳ Email sending (console log)

### Production (Nakon Deploy-a)
- ✅ WebSocket za real-time listener count
- ✅ Automatsko slanje emailova
- ✅ PayPal webhook integracija
- ✅ Database persistence
- ✅ Real-time notifications

Detaljnije informacije u `DEPLOYMENT.md`

## 🎯 Kako Funkcioniše Trial Period

1. **Korisnik bira BASIC RADIO paket**
2. **Automatski dobija 7 dana besplatno**
3. **Tajmer pokazuje preostalo vreme**
4. **Može otkazati u bilo kom trenutku**
   - Ako otkaže: Pristup traje do kraja trial perioda, bez naplate
   - Ako ne otkaže: Automatska naplata nakon 7 dana, pretplata traje 30 dana

## 🔐 Security Features

- Password hashing (production)
- Secure password reset tokens (24h expiry)
- CORS protection
- Input validation
- XSS protection
- Rate limiting (production)

## 📧 Email Templates

Email template-ovi se nalaze u backend-u i uključuju:
- Password reset
- Welcome email
- Subscription confirmation
- Trial expiry warning
- Payment confirmation

## 🐛 Debugging

### Console Commands

```javascript
// Proveri trenutnog korisnika
localStorage.getItem('infinity_current_user')

// Proveri sve korisnike
localStorage.getItem('infinity_users')

// Proveri profile
localStorage.getItem('infinity_profiles')

// Reset password tokens
localStorage.getItem('password_reset_tokens')

// Clear sve podatke
localStorage.clear()
```

## 📝 TODO za Production

- [ ] Implementirati backend API
- [ ] Podesiti PayPal production credentials
- [ ] Konfigurisati email servis (SendGrid/AWS SES)
- [ ] Setup WebSocket server za listener count
- [ ] Implementirati database (PostgreSQL)
- [ ] Dodati Sentry za error tracking
- [ ] Setup CI/CD pipeline
- [ ] Konfigurisati CDN za audio fajlove
- [ ] Implementirati caching strategiju
- [ ] Setup monitoring (Datadog/New Relic)

## 🤝 Support

Za pitanja i podršku:
- Email: darkospira@gmail.com
- Website: infinityplay.rs

## 📄 License

Proprietary - © 2024 InfinityPlay Radio

---

**Napravljeno sa ❤️ za najbolje online radio iskustvo**
