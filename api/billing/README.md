# Billing (B2B faktura + SEF) — PHP

Naplata po fakturi za firme, uz postojeći Paddle (kartica). Sve u PHP-u (Loopia
shared hosting ne podržava Node). Modul `infinityplay-billing` (Node) je
referenca za port — vidi `~/Downloads/infinityplay-billing`.

## Šta je gde (Korak 1 — završeno)

- `Subscription.php` — **state machine + `hasAccess()`**. Čista klasa, bez baze.
  Jedini izvor istine o tome da li stream radi. Stanja: `trialing`, `active`,
  `pending_payment`, `past_due`, `canceling`, `expired`.
- `BillingRepo.php` — PDO sloj (konekcija se injektuje). Atomičan brojač faktura,
  idempotencija Paddle webhook-a, unique zaštita od duplog crona, `applyEvent()`
  (učitaj → primeni prelaz → upiši → loguj u `billing_events`).
- `../../database/migrations/2026_08_14_billing.sql` — MariaDB tabele.
- `tests/` — čisti unit + DB-integracioni testovi.

## Lokalno testiranje (bez diranja živog sajta)

Preduslov: lokalni MariaDB + PHP (već postoje na ovoj mašini).

```bash
# 1. Učitaj šemu sajta (ako lokalna baza ne postoji) pa billing migraciju:
mysql infinityplay_local < database/mariadb_schema.sql        # samo prvi put
mysql infinityplay_local < database/migrations/2026_08_14_billing.sql

# 2. Pokreni testove:
./api/billing/tests/run.sh
```

DB testovi se konektuju na `infinityplay_local` preko unix socket-a
(`/tmp/mysql.sock`) kao `mysql` CLI. Override kroz env:
`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_SOCKET`.

Testovi se sami čiste (ništa ne ostaje u bazi) i izoluju brojače na test-godine.

## Kako da vidiš SVE na localhostu (frontend + bekend + baza)

Dva terminala:

```bash
# Terminal 1 — PHP backend, gađa lokalnu bazu (config.local.php), mejl=dryrun
php -S 127.0.0.1:8787 -t api

# Terminal 2 — frontend, /api ide na lokalni PHP (a ne na produkciju)
VITE_PROXY_TARGET=http://127.0.0.1:8787 npm run dev
```

Otvori `http://localhost:5173/checkout?plan=branded-radio`. Bez env-a, `npm run dev`
i dalje gađa PRODUKCIJU (podrazumevano), pa je prebacivanje svesno.

Ručno okretanje worker-a/crona (umesto Loopia URL-crona):
```bash
php api/billing_worker.php                 # izda fakture iz billing_jobs (mejl=dryrun)
php api/billing_cron.php --date=2026-09-01  # simuliraj obnovu/dunning na dati datum
```

Baza:
```bash
mysql infinityplay_local -e "SELECT state,plan,access_until FROM subscriptions;"
mysql infinityplay_local -e "SELECT broj_fakture,status,ukupno,poziv_na_broj FROM invoices;"
```

## Sledeći koraci (2–8)

Checkout dve kolone (`/checkout`), forma za firme (`/checkout/firma`), izdavanje
fakture (UBL/SEF/IPS-QR/mejl) kao `billing_jobs` worker, Paddle webhook u isti
state machine, cron obnova + dunning, uparivanje izvoda, UI u portalu.
