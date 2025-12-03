# 🚀 Brzi Start - GitHub Pages Deployment

## 📦 Šta je urađeno?

✅ **Ispravljene greške u `deploy.yml`**
- Ispravljena sintaksa za GitHub secrets
- Automatski deployment na svaki push

✅ **Kreiran sistem plaćanja identičan kaferadio.net**
- 🇷🇸 **Srbija:** Bankovski transfer
- 🇲🇪🇭🇷🇧🇦 **Crna Gora/Hrvatska/BiH:** PostKeš usluga
- 🌍 **Ostale zemlje:** PayPal/Kartica

✅ **Podešen automatski real-time deployment**
- Svaka izmena koda se automatski deploy-uje
- GitHub Actions workflow
- Besplatan hosting na GitHub Pages

## 🎯 Kako pokrenuti sajt?

### Metod 1: Automatski (Preporučeno) ⚡

Jednostavno pokrenite script:

```bash
./deploy-to-github.sh
```

Script će vas voditi kroz proces i automatski:
1. Inicijalizovati Git repository
2. Dodati GitHub remote
3. Push-ovati kod
4. Dati vam instrukcije za finalizaciju

### Metod 2: Ručno 🔧

#### Korak 1: Kreirajte GitHub Repository

1. Idite na https://github.com/new
2. Unesite naziv (npr. `radio-website`)
3. **NE** dodavajte README, .gitignore ili licencu
4. Kliknite "Create repository"

#### Korak 2: Push kod na GitHub

```bash
# Inicijalizuj Git (ako već nije)
git init

# Dodaj sve fajlove
git add .

# Napravi commit
git commit -m "Initial commit - Radio website"

# Dodaj remote (zameni sa svojim podacima)
git remote add origin https://github.com/TVOJ-USERNAME/TVOJ-REPO.git

# Push na GitHub
git branch -M main
git push -u origin main
```

#### Korak 3: Dodajte GitHub Secrets

1. Idite na: `https://github.com/TVOJ-USERNAME/TVOJ-REPO/settings/secrets/actions`
2. Kliknite **"New repository secret"**
3. Dodajte:

**Secret 1:**
- Name: `VITE_SUPABASE_URL`
- Value: `https://huyiaierkscuhxlvvtit.supabase.co`

**Secret 2:**
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA`

#### Korak 4: Omogućite GitHub Pages

1. Idite na: `https://github.com/TVOJ-USERNAME/TVOJ-REPO/settings/pages`
2. Pod **Source**, izaberite: `Deploy from a branch`
3. Pod **Branch**, izaberite: `gh-pages` i `/ (root)`
4. Kliknite **Save**

#### Korak 5: Sačekajte Deployment

1. Idite na **Actions** tab
2. Videćete deployment u toku
3. Sačekajte 2-3 minuta

#### Korak 6: Pristupite Sajtu! 🎉

Vaš sajt će biti dostupan na:
```
https://TVOJ-USERNAME.github.io/TVOJ-REPO/
```

## 🔄 Kako ažurirati sajt?

Svaki put kada želite da promenite nešto na sajtu:

```bash
# 1. Napravite izmene u kodu
# 2. Dodajte izmene
git add .

# 3. Commit
git commit -m "Opis šta ste promenili"

# 4. Push
git push
```

**Sajt će se automatski ažurirati za 2-3 minuta!** ⚡

## 📊 Praćenje Deployment-a

- **Actions tab:** Vidite sve deployment-e i njihov status
- **Zelena kvačica:** Deployment uspešan ✅
- **Crveni X:** Greška u deployment-u ❌

## 💳 Sistem Plaćanja

Novi sistem plaćanja je identičan kaferadio.net:

### Paketi:
- 🎵 **WEB RADIO:** 15€/mesečno (7 dana probni period)
- 📦 **BOX RADIO:** 50€/mesečno
- 🎯 **MOJ RADIO:** 240€/godišnje (ušteda 33%)

### Popusti:
- 5 meseci unapred: **10% popusta**
- 10 meseci unapred: **20% popusta**

### Metodi plaćanja po zemljama:

#### 🇷🇸 Srbija
- **Bankovski transfer**
- Prikazuju se podaci za uplatu
- Aktivacija u roku od 24h

#### 🇲🇪 Crna Gora / 🇭🇷 Hrvatska / 🇧🇦 BiH
- **PostKeš usluga**
- Uputstva za plaćanje u pošti
- Aktivacija u roku od 24-48h

#### 🌍 Ostale zemlje
- **PayPal / Kreditna kartica**
- Instant aktivacija
- Sigurno online plaćanje

## 🔧 Podešavanje Podataka za Plaćanje

Da biste dodali svoje podatke za plaćanje, ažurirajte:

**Fajl:** `src/pages/PaymentPage.tsx`

**Za Srbiju (linija ~147):**
```typescript
<p className="font-mono font-bold text-gray-900 dark:text-white">
  [TVOJA FIRMA D.O.O. BEOGRAD]  // ← Promeni ovo
</p>
...
<p className="font-mono font-bold text-gray-900 dark:text-white">
  [325-9500500002546-27]  // ← Promeni broj računa
</p>
```

## 🐛 Troubleshooting

### Problem: Deployment ne radi
**Rešenje:**
- Proverite da li su secrets dodati
- Pogledajte Actions tab za greške
- Proverite da li je `gh-pages` branch kreiran

### Problem: Sajt pokazuje 404
**Rešenje:**
- Sačekajte 5-10 minuta nakon prvog deployment-a
- Proverite GitHub Pages settings
- Očistite browser cache (Ctrl+Shift+R)

### Problem: Izmene se ne prikazuju
**Rešenje:**
- Očistite cache (Ctrl+Shift+R ili Cmd+Shift+R)
- Proverite Actions tab da li je deployment završen
- Sačekajte 2-3 minuta

## 📁 Važni Fajlovi

- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `src/pages/PaymentPage.tsx` - Sistem plaćanja
- `vite.config.ts` - Vite konfiguracija za GitHub Pages
- `GITHUB_DEPLOYMENT.md` - Detaljna dokumentacija

## 🎯 Custom Domain (Opciono)

Ako želite custom domain (npr. `radio.infinityplay.rs`):

1. Kupite domain
2. Dodajte CNAME record u DNS:
   - Name: `radio` (ili `@`)
   - Value: `TVOJ-USERNAME.github.io`
3. U GitHub Pages settings, dodajte custom domain
4. Ažurirajte `deploy.yml` (linija 37):
   ```yaml
   cname: radio.infinityplay.rs
   ```

## 📞 Dodatna Pomoć

Za detaljnu dokumentaciju, pogledajte:
- `GITHUB_DEPLOYMENT.md` - Kompletan vodič
- `REALTIME_DEPLOYMENT.md` - Real-time deployment info

## ✨ Šta Dalje?

1. ✅ Dodajte svoje podatke za plaćanje
2. ✅ Testirajte sajt
3. ✅ Podelite link sa korisnicima
4. ✅ Pratite analytics u admin panelu

---

**Napravljen sa ❤️ za Infinity Play Radio**

*Sva plaćanja su prepaid (unapred). Kontaktirajte nas za dodatne informacije.*
