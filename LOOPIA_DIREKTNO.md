# 🚀 Loopia Direktni Deploy (Bez GitHub-a)

Napravio sam ti sistem koji zaobilazi GitHub i šalje sajt direktno sa tvog kompjutera na Loopia server.

## ⚠️ PRVI KORAK (Obavezno!)

Moraš uneti svoje Loopia podatke u skriptu.

1.  Otvori fajl: `scripts/upload-to-loopia.js`
2.  Pronađi linije 11-13:
    ```javascript
    host: "ftp.loopia.rs",      // Proveri da li je ovo tačno
    user: "TVOJ_FTP_USERNAME",  // Unesi svoj FTP username
    password: "TVOJA_FTP_LOZINKA", // Unesi svoju FTP lozinku
    ```
3.  Pronađi liniju 18 i unesi tačnu putanju na serveru:
    ```javascript
    remoteRoot: "/radio.infinityplay.rs/public_html/" // Gde želiš da sajt stoji
    ```
4.  Sačuvaj fajl.

---

## 🔄 Kako da radiš (Real-time Workflow)

Evo kako se sada radi na sajtu:

### 1. Dok menjaš kod (Development)
Pokreni ovu komandu da bi video izmene **odmah** na svom kompjuteru:

```bash
npm run dev
```

Otvoriće ti se sajt na `http://localhost:5173`. Sve što promeniš u kodu, videćeš tu istog trenutka.

### 2. Kada želiš da objaviš na internet (Deploy)
Kada si zadovoljan kako izgleda na tvom kompjuteru i želiš da to vide svi na `radio.infinityplay.rs`, samo ukucaj:

```bash
npm run deploy
```

Ova "magična komanda" će:
1.  🏗️ **Build:** Prevesti tvoj kod u format koji Loopia razume.
2.  🚀 **Upload:** Automatski prebaciti sve fajlove na Loopia server.

Ceo proces traje oko 30-60 sekundi.

---

## ❓ Česta Pitanja

**P: Zašto ne mogu da menjam fajlove direktno na Loopia serveru?**
O: Zato što Loopia (i browseri) ne razumeju `.tsx` fajlove. Oni moraju da se "prevedu" u običan JavaScript pre nego što prorade. Zato moraš da radiš kod sebe, pa da "prevedeš i pošalješ" (to radi `npm run deploy`).

**P: Šta ako dobijem grešku "Login incorrect"?**
O: Proveri username i password u `scripts/upload-to-loopia.js`.

**P: Šta ako dobijem grešku "ECONNREFUSED"?**
O: Verovatno je pogrešna adresa servera (`host`). Proveri u Loopia panelu da li je `ftp.loopia.rs` ili `ftp.cluster.loopia.se`.
