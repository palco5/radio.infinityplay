# 🔒 Password Reset Sistem - Kompletan Vodič

## ✅ Šta je Urađeno

### 1. 📧 Email Servis sa Resend

**Implementovano:**
- ✅ Resend integracija (besplatno do 3000 emailova/mesec)
- ✅ Profesionalni HTML email template na srpskom
- ✅ Password reset email sa lepim dizajnom
- ✅ Welcome email za nove korisnike
- ✅ Token generisanje i validacija
- ✅ Automatsko slanje emailova

**Fajlovi:**
- `src/lib/emailService.ts` - Email servis
- `src/components/admin/SendPasswordResetModal.tsx` - Ažuriran
- `src/pages/ResetPasswordPage.tsx` - Nova stranica

---

## 🎯 Kako Radi

### 1. Admin Šalje Reset Link

1. Admin otvori Admin Panel
2. Klikne na ljubičastu mail ikonicu pored korisnika
3. Potvrdi slanje
4. Email se šalje korisniku

### 2. Korisnik Prima Email

Email sadrži:
- 🎵 InfinityPlay branding
- 👤 Personalizovana poruka
- 🔒 Dugme za resetovanje
- ⏰ Napomena da link važi 24h
- ⚠️ Upozorenje o sigurnosti

### 3. Korisnik Resetuje Lozinku

1. Klikne na link u emailu
2. Otvara se stranica za resetovanje
3. Unese novu lozinku (minimum 6 karaktera)
4. Potvrdi lozinku
5. Lozinka je promenjena! ✅

---

## 🚀 Setup - Resend (Besplatno)

### Korak 1: Registracija

1. Idi na: https://resend.com
2. Klikni **Sign Up**
3. Unesi email i kreiraj nalog
4. Potvrdi email

### Korak 2: Kreiraj API Key

1. Uloguj se na Resend
2. Idi na **API Keys**
3. Klikni **Create API Key**
4. Ime: `InfinityPlay Radio`
5. Permission: **Full Access**
6. Kopiraj API key (prikaže se samo jednom!)

### Korak 3: Dodaj u .env

Otvori `.env` fajl i dodaj:

```bash
VITE_RESEND_API_KEY=re_tvoj_api_key_ovde
```

**NAPOMENA:** Zameni `re_tvoj_api_key_ovde` sa pravim API keyem!

### Korak 4: Restart Dev Server

```bash
# Zaustavi server (Ctrl+C)
npm run dev
```

---

## 📧 Email Template

### Password Reset Email

Email koji korisnik dobije izgleda ovako:

```
┌─────────────────────────────────────┐
│  🎵 InfinityPlay Radio              │
│  Tvoj zvuk. Tvoj radio.             │
└─────────────────────────────────────┘

Pozdrav [Ime Korisnika],

Primili smo zahtev za resetovanje lozinke 
za vaš InfinityPlay Radio nalog.

┌─────────────────────────────────────┐
│   🔒 Resetuj Lozinku                │
└─────────────────────────────────────┘

📌 Napomena: Link je validan 24 sata

⚠️ Upozorenje: Ako niste vi zatražili 
resetovanje, ignorišite ovaj email.

---
InfinityPlay Radio
🌐 infinityplay.rs
📧 radio@infinityplay.rs
```

---

## 🔄 Kako Testirati

### Test 1: Lokalno (Bez Resend)

```bash
# 1. Pokreni aplikaciju
npm run dev

# 2. Uloguj se kao admin
Email: darkospira@gmail.com
Password: Racivaci5!

# 3. Idi u Admin Panel

# 4. Klikni na ljubičastu mail ikonicu

# 5. Proveri konzolu - link će biti prikazan
```

**Output u konzoli:**
```
⚠️ RESEND NIJE KONFIGURISAN - PASSWORD RESET LINK:
============================================================
Email: test@gmail.com
Link: http://localhost:5173/reset-password?token=abc123
============================================================

📧 Da bi email radio, dodaj VITE_RESEND_API_KEY u .env fajl
🔗 Registruj se na: https://resend.com (besplatno)
```

### Test 2: Sa Resend

```bash
# 1. Dodaj VITE_RESEND_API_KEY u .env

# 2. Restart dev server
npm run dev

# 3. Pošalji reset email

# 4. Proveri email inbox
```

**Output u konzoli:**
```
✅ Password reset email poslat na: test@gmail.com
```

### Test 3: Resetovanje Lozinke

1. Klikni na link u emailu (ili kopiraj iz konzole)
2. Otvara se stranica: `/reset-password?token=...`
3. Unesi novu lozinku
4. Potvrdi lozinku
5. Klikni "Resetuj Lozinku"
6. Uspeh! ✅

---

## 🎨 Email Dizajn

Email template ima:

### Header
- 🎵 Logo (zeleni krug sa emoji-jem)
- **InfinityPlay Radio** naslov
- "Tvoj zvuk. Tvoj radio." subtitle
- Gradijent pozadina (zelena)

### Content
- Personalizovana poruka
- Dugme za resetovanje (zeleno, sa hover efektom)
- Info box sa napomenom (24h validnost)
- Warning box (ako nije korisnik zatražio)

### Footer
- InfinityPlay branding
- Linkovi (website, email)
- Copyright
- Disclaimer

---

## 🔒 Sigurnost

### Token Sistem

**Generisanje:**
```typescript
const token = Math.random().toString(36).substring(2) + 
              Date.now().toString(36);
```

**Čuvanje:**
```typescript
{
  "token123": {
    "token": "token123",
    "expires": 1234567890, // 24h od sada
    "createdAt": 1234567890
  }
}
```

**Validacija:**
- Provera da li token postoji
- Provera da li je istekao (24h)
- Automatsko brisanje isteklih tokena

---

## 📊 Resend Limiti (Besplatno)

### Free Plan:
- ✅ **3,000 emailova/mesec**
- ✅ **100 emailova/dan**
- ✅ **Neograničeni API keys**
- ✅ **Email analytics**
- ✅ **Webhook support**

### Dovoljno za:
- 100 password reset-ova dnevno
- 3000 mesečno
- Idealno za development i manje aplikacije

---

## 🚀 Production Setup

### GitHub Secrets

Dodaj u GitHub Secrets:

```
VITE_RESEND_API_KEY = re_tvoj_api_key
```

### .env.production

```bash
VITE_RESEND_API_KEY=re_tvoj_api_key
VITE_SUPABASE_URL=https://huyiaierkscuhxlvvtit.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📧 Custom Email Domain (Opciono)

### Umesto `onboarding@resend.dev`, koristi svoj domain:

1. **Dodaj Domain u Resend:**
   - Settings → Domains
   - Add Domain
   - Unesi: `infinityplay.rs`

2. **Dodaj DNS Records:**
   ```
   Type: TXT
   Name: @
   Value: [Resend će dati]

   Type: MX
   Name: @
   Value: [Resend će dati]
   ```

3. **Verifikuj Domain:**
   - Klikni "Verify"
   - Čekaj 5-10 minuta

4. **Koristi Custom Email:**
   ```typescript
   from: 'InfinityPlay Radio <noreply@infinityplay.rs>'
   ```

---

## 🐛 Troubleshooting

### Email se ne šalje?

**Proveri:**
1. Da li je `VITE_RESEND_API_KEY` u `.env`?
2. Da li si restart-ovao dev server?
3. Da li je API key validan?
4. Proveri konzolu za greške

### Link ne radi?

**Proveri:**
1. Da li je token validan?
2. Da li je istekao (24h)?
3. Proveri URL - mora biti `/reset-password?token=...`

### Email ide u spam?

**Rešenje:**
1. Dodaj custom domain (infinityplay.rs)
2. Verifikuj domain u Resend
3. Dodaj SPF i DKIM records

---

## ✅ Checklist

Pre production-a:

- [ ] Resend nalog kreiran
- [ ] API key dodat u `.env`
- [ ] Testiran lokalno
- [ ] Email prima se u inbox
- [ ] Reset link radi
- [ ] Lozinka se menja
- [ ] GitHub Secret dodat
- [ ] Custom domain (opciono)

---

## 📞 Podrška

- 📧 Email: darkospira@gmail.com
- 🌐 Website: infinityplay.rs
- 🔗 Resend Docs: https://resend.com/docs

---

## 🎉 Gotovo!

Sada imaš:
- ✅ Profesionalni password reset sistem
- ✅ Lepe email template-e na srpskom
- ✅ Besplatno slanje emailova (Resend)
- ✅ Sigurni token sistem (24h)
- ✅ Kompletnu dokumentaciju

**Svaki password reset = Profesionalni email na srpskom! 📧**

---

**Srećno! 🔒**
