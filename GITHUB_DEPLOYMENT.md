# 🚀 GitHub Pages Deployment - Vodič

## Pregled

Ovaj vodič objašnjava kako podesiti automatski deployment vašeg sajta na GitHub Pages sa real-time ažuriranjima.

## 📋 Preduslov

1. GitHub nalog
2. Git instaliran na računaru
3. Projekat spreman za deployment

## 🔧 Korak 1: Podešavanje GitHub Secrets

Pre nego što pokrenete deployment, morate dodati Supabase kredencijale kao GitHub Secrets:

1. Idite na vaš GitHub repository
2. Kliknite na **Settings** (Podešavanja)
3. U levom meniju, kliknite na **Secrets and variables** → **Actions**
4. Kliknite **New repository secret**
5. Dodajte sledeće secrets:

### Secret 1: VITE_SUPABASE_URL
- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://huyiaierkscuhxlvvtit.supabase.co`

### Secret 2: VITE_SUPABASE_ANON_KEY
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA`

## 🔧 Korak 2: Omogućavanje GitHub Pages

1. U repository settings, skrolujte do **Pages** sekcije
2. Pod **Source**, izaberite **Deploy from a branch**
3. Pod **Branch**, izaberite `gh-pages` i folder `/ (root)`
4. Kliknite **Save**

## 🔧 Korak 3: Inicijalizacija Git Repository (ako već nije)

```bash
# Inicijalizuj git ako nije već
git init

# Dodaj sve fajlove
git add .

# Napravi prvi commit
git commit -m "Initial commit - Radio website"

# Dodaj remote repository (zameni sa svojim GitHub repo URL-om)
git remote add origin https://github.com/TVOJ-USERNAME/TVOJ-REPO.git

# Push na GitHub
git branch -M main
git push -u origin main
```

## 🚀 Korak 4: Automatski Deployment

Nakon što push-ujete kod na `main` branch, GitHub Actions će automatski:

1. ✅ Instalirati dependencies
2. ✅ Build-ovati projekat
3. ✅ Deploy-ovati na GitHub Pages

Možete pratiti progress u **Actions** tabu vašeg repository-ja.

## 🌐 Korak 5: Pristup Sajtu

Nakon uspešnog deployment-a, vaš sajt će biti dostupan na:

```
https://TVOJ-USERNAME.github.io/TVOJ-REPO/
```

## 🔄 Real-Time Ažuriranje

### Kako funkcioniše?

Svaki put kada napravite izmenu u kodu i push-ujete na GitHub:

```bash
# Napravi izmene u kodu
# ...

# Dodaj izmene
git add .

# Commit
git commit -m "Opis izmena"

# Push na GitHub
git push
```

**GitHub Actions će automatski:**
1. Detektovati nove izmene
2. Pokrenuti build process
3. Deploy-ovati novu verziju
4. Vaš sajt će biti ažuriran za 2-3 minuta! ⚡

### Praćenje Deployment-a

1. Idite na **Actions** tab u vašem repository-ju
2. Videćete listu svih deployment-a
3. Kliknite na bilo koji da vidite detalje i logove

## 🎯 Custom Domain (Opciono)

Ako želite da koristite custom domain (npr. `radio.infinityplay.rs`):

1. Kupite domain
2. U DNS podešavanjima, dodajte CNAME record:
   - **Name:** `radio` (ili `@` za root domain)
   - **Value:** `TVOJ-USERNAME.github.io`
3. U repository settings → Pages, dodajte custom domain
4. Ažurirajte `deploy.yml` fajl (već podešeno):
   ```yaml
   cname: radio.infinityplay.rs
   ```

## 🔒 Sigurnost

- ✅ Secrets su bezbedno čuvani u GitHub-u
- ✅ Nikada ne commit-ujte `.env` fajlove sa kredencijalima
- ✅ Koristite GitHub Secrets za sve osetljive podatke

## 🐛 Troubleshooting

### Problem: Deployment ne radi

**Rešenje:**
1. Proverite da li su secrets pravilno podešeni
2. Proverite Actions tab za error logove
3. Uverite se da je `gh-pages` branch kreiran

### Problem: Sajt pokazuje 404

**Rešenje:**
1. Sačekajte 5-10 minuta nakon prvog deployment-a
2. Proverite da li je GitHub Pages omogućen u settings
3. Proverite da li je branch pravilno podešen

### Problem: Izmene se ne prikazuju

**Rešenje:**
1. Očistite browser cache (Ctrl+Shift+R ili Cmd+Shift+R)
2. Sačekajte da se deployment završi (proverite Actions tab)
3. Proverite da li je build uspešan

## 📊 Monitoring

Možete pratiti:
- **Build time:** Koliko traje build process
- **Deployment status:** Da li je uspešan ili ne
- **Error logs:** Ako nešto ne radi

## 🎉 Gotovo!

Vaš sajt je sada:
- ✅ Automatski deploy-ovan na GitHub Pages
- ✅ Real-time ažuriranje sa svakim push-om
- ✅ Besplatan hosting
- ✅ HTTPS podržan
- ✅ Globalno dostupan

## 📞 Dodatna Pomoć

Ako imate problema, proverite:
- [GitHub Pages dokumentaciju](https://docs.github.com/en/pages)
- [GitHub Actions dokumentaciju](https://docs.github.com/en/actions)
- Actions tab u vašem repository-ju za detaljne logove
