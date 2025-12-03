# 🚀 Kako Deploy-ovati na Loopia Hosting (Real-time Updates)

Ovo uputstvo će ti omogućiti da se tvoj sajt automatski ažurira na Loopia hostingu svaki put kada uradiš `git push`.

## ✅ Preduslovi

1.  Imaš Loopia nalog i hosting paket.
2.  Imaš kreiran domen (npr. `radio.infinityplay.rs`) u Loopia panelu.
3.  Imaš pristup FTP podacima.

---

## 🛠️ Korak 1: Pripremi Loopia FTP Podatke

1.  Uloguj se u Loopia korisnički panel.
2.  Idi na **FTP nalozi**.
3.  Kreiraj novi FTP nalog (ili koristi postojeći) koji ima pristup folderu tvog sajta.
    *   **Server:** Obično `ftp.loopia.rs` ili `ftp.cluster.loopia.se`.
    *   **Username:** Tvoje korisničko ime (npr. `mojnalog@loopia.rs`).
    *   **Password:** Tvoja lozinka.

**VAŽNO:** Zapamti tačnu putanju do foldera gde treba da stoje fajlovi sajta (npr. `/mojdomen.rs/public_html/`).

---

## 🔐 Korak 2: Podesi GitHub Secrets

Da bi GitHub mogao da šalje fajlove na Loopia-u, moraš mu dati pristup.

1.  Idi na svoj GitHub repository: `https://github.com/palco5/radio.infinityplay`
2.  Klikni na **Settings** -> **Secrets and variables** -> **Actions**.
3.  Klikni **New repository secret** i dodaj sledeća 3 tajna podatka:

| Name | Value (Primer) |
|------|----------------|
| `FTP_SERVER` | `ftp.loopia.rs` |
| `FTP_USERNAME` | `tvoj_ftp_user@loopia.rs` |
| `FTP_PASSWORD` | `tvoja_ftp_lozinka` |

---

## ⚙️ Korak 3: Proveri Putanju na Serveru

Otvori fajl `.github/workflows/ftp-deploy.yml` u svom projektu.

Na liniji 26 piše:
```yaml
server-dir: ./public_html/
```

Ako tvoj sajt na Loopia serveru stoji u nekom podfolderu (npr. `radio.infinityplay.rs/public_html/`), moraš promeniti ovu liniju!
Ako nisi siguran, uloguj se preko FileZilla-e i proveri putanju.

---

## 🔄 Korak 4: Kako Raditi "Real-time" Izmene?

Sada kada je sve podešeno, tvoj workflow je sledeći:

1.  **Menjaš kod** na svom kompjuteru.
2.  **Testiraš lokalno:** `npm run dev`.
3.  **Kada si zadovoljan, pošalješ na GitHub:**

```bash
git add .
git commit -m "Moje izmene"
git push
```

4.  **GOTOVO!** 🚀
    *   GitHub će automatski prepoznati izmenu.
    *   Pokrenuće "Build" proces.
    *   Kada završi (2-3 minuta), automatski će prebaciti nove fajlove na Loopia server preko FTP-a.

---

## 🐛 Troubleshooting (Ako nešto ne radi)

### Sajt se ne vidi (Beli ekran ili 404)
1.  Proveri da li je folder na Loopia serveru prazan pre prvog upload-a (osim sistemskih fajlova).
2.  Proveri da li je `server-dir` u `ftp-deploy.yml` tačan.
3.  U Loopia panelu, uveri se da je "Document Root" za tvoj domen podešen na taj folder.

### GitHub Action prijavljuje grešku
1.  Idi na **Actions** tab na GitHub-u.
2.  Klikni na crveni workflow.
3.  Pogledaj logove. Najčešće greške su:
    *   Pogrešna lozinka (`530 Login incorrect`).
    *   Pogrešan server (`ECONNREFUSED`).
    *   Timeout (server spor).

---

## 📝 Dodatna Napomena za React Router

Pošto koristiš React (Single Page App), moraš reći Loopia serveru da sve zahteve šalje na `index.html`.
U suprotnom, ako neko ode direktno na `radio.infinityplay.rs/dashboard`, dobiće 404 grešku.

**Rešenje:**
Kreiraj fajl `.htaccess` u `public` folderu tvog projekta sa ovim sadržajem:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Ja ću ti sada kreirati ovaj fajl automatski.
