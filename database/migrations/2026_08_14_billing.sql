-- ============================================================================
-- InfinityPlay — Billing (B2B faktura + SEF) migracija za MariaDB
-- ============================================================================
-- Jedan model podataka koji pokriva OBA načina plaćanja (kartica Polar i
-- plaćanje po fakturi). Stanje pretplate (state machine) živi u `subscriptions`;
-- `profiles` ostaje identitet korisnika. Svi novčani iznosi su DECIMAL(12,2),
-- nikad float. Vremena su u Europe/Belgrade (aplikacija postavlja timezone).
--
-- Idempotentno: sve tabele su CREATE TABLE IF NOT EXISTS, pa je bezbedno
-- pokrenuti migraciju više puta.
-- ============================================================================

-- ── Firme kojima se izdaje faktura ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_clients (
  id                CHAR(36)      PRIMARY KEY,
  user_id           CHAR(36)      NOT NULL,
  naziv             VARCHAR(255)  NOT NULL,
  pib               CHAR(9)       NOT NULL,
  maticni_broj      CHAR(8)       NOT NULL,
  adresa            VARCHAR(255)  NOT NULL,
  grad              VARCHAR(120)  NOT NULL,
  postanski_broj    VARCHAR(16)   NOT NULL,
  email             VARCHAR(255)  NOT NULL,      -- mejl za fakture
  telefon           VARCHAR(40)   NULL,
  kontakt_osoba     VARCHAR(160)  NULL,
  u_sistemu_pdv     TINYINT(1)    NOT NULL DEFAULT 1,
  drzava            CHAR(2)       NOT NULL DEFAULT 'RS',  -- RS -> SEF, ostalo samo mejl
  -- Postane 0 kad SEF odbije jer primalac nije registrovan; sledeći put ne pokušavamo SEF.
  sef_registered    TINYINT(1)    NOT NULL DEFAULT 1,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_client_user_pib (user_id, pib),
  KEY idx_client_user (user_id),
  CONSTRAINT fk_client_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Pretplate — jedinstven state machine za karticu i fakturu ────────────────
-- state: trialing | active | pending_payment | past_due | canceling | expired
-- hasAccess() = true za trialing/active/pending_payment/canceling (u okviru
-- odgovarajućeg vremenskog roka), false za past_due/expired. Vidi api/billing/Subscription.php.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    CHAR(36)      PRIMARY KEY,
  user_id               CHAR(36)      NOT NULL,
  client_id             CHAR(36)      NULL,      -- NULL za karticu (Polar)
  payment_method        VARCHAR(16)   NOT NULL DEFAULT 'faktura',  -- faktura | card
  plan                  VARCHAR(50)   NOT NULL,  -- basic-radio | branded-radio | host-radio
  ciklus                VARCHAR(16)   NOT NULL DEFAULT 'godisnje',  -- mesecno | godisnje
  broj_lokacija         INT           NOT NULL DEFAULT 1,
  cena_po_lokaciji      DECIMAL(12,2) NOT NULL DEFAULT 0,
  setup_fee             DECIMAL(12,2) NOT NULL DEFAULT 0,
  setup_fee_naplacen    TINYINT(1)    NOT NULL DEFAULT 0,
  currency              CHAR(3)       NOT NULL DEFAULT 'RSD',

  state                 VARCHAR(24)   NOT NULL DEFAULT 'trialing',
  trial_ends_at         DATETIME      NULL,
  current_period_start  DATETIME      NULL,
  current_period_end    DATETIME      NULL,
  access_until          DATETIME      NULL,      -- 3-dnevni grace u pending_payment
  next_billing_date     DATE          NULL,      -- cron gleda ovo polje
  cancel_at_period_end  TINYINT(1)    NOT NULL DEFAULT 0,

  provider_customer_id   VARCHAR(64)  NULL,
  provider_subscription_id VARCHAR(64) NULL,
  billing_provider       VARCHAR(20)  NULL,

  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  canceled_at           DATETIME      NULL,

  KEY idx_sub_user (user_id),
  KEY idx_sub_state (state),
  KEY idx_sub_next_billing (next_billing_date, state),
  KEY idx_sub_provider (provider_subscription_id),
  CONSTRAINT fk_sub_user   FOREIGN KEY (user_id)   REFERENCES profiles(id)        ON DELETE CASCADE,
  CONSTRAINT fk_sub_client FOREIGN KEY (client_id) REFERENCES billing_clients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Atomični brojač za brojeve faktura (MariaDB nema SEQUENCE) ───────────────
-- nextInvoiceSequence() koristi LAST_INSERT_ID(expr) pattern -> atomično i bez rupa.
CREATE TABLE IF NOT EXISTS invoice_counters (
  year      INT NOT NULL PRIMARY KEY,
  last_seq  INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Fakture ─────────────────────────────────────────────────────────────────
-- id (BIGINT AUTO_INCREMENT) je STABILAN SEF requestId -> retry ne pravi duplikat.
CREATE TABLE IF NOT EXISTS invoices (
  id                  BIGINT        AUTO_INCREMENT PRIMARY KEY,
  subscription_id     CHAR(36)      NOT NULL,
  client_id           CHAR(36)      NOT NULL,

  broj_fakture        VARCHAR(32)   NOT NULL,
  period_key          VARCHAR(16)   NOT NULL,   -- '2026-09' ili '2026-G-09'
  datum_izdavanja     DATE          NOT NULL,
  datum_valute        DATE          NOT NULL,
  datum_prometa       DATE          NOT NULL,

  poziv_na_broj       VARCHAR(32)   NOT NULL,   -- '97 ...'  (model 97)
  poziv_na_broj_ips   VARCHAR(32)   NOT NULL,   -- za IPS QR (bez separatora)

  osnovica            DECIMAL(12,2) NOT NULL,
  pdv                 DECIMAL(12,2) NOT NULL,
  ukupno              DECIMAL(12,2) NOT NULL,
  valuta              CHAR(3)       NOT NULL DEFAULT 'RSD',
  stavke              JSON          NOT NULL,

  -- draft: kreirana; sent: poslata (SEF i/ili mejl); paid: uplaćena;
  -- sef_failed: mejl poslat ali SEF odbio/nedostupan; canceled/failed.
  status              VARCHAR(16)   NOT NULL DEFAULT 'draft',
  ubl_xml             LONGTEXT      NULL,
  sef_invoice_id      VARCHAR(64)   NULL,
  sef_status          VARCHAR(32)   NULL,
  sef_response        JSON          NULL,
  sent_at             DATETIME      NULL,
  email_sent_at       DATETIME      NULL,

  placeno_datum       DATE          NULL,
  placeno_iznos       DECIMAL(12,2) NULL,
  izvod_ref           VARCHAR(64)   NULL,

  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_broj_fakture (broj_fakture),
  UNIQUE KEY uq_poziv_na_broj (poziv_na_broj),
  -- Zaštita od duplog crona: jedna faktura po pretplati i periodu.
  UNIQUE KEY uq_invoice_period (subscription_id, period_key),
  KEY idx_invoice_pnb (poziv_na_broj),
  KEY idx_invoice_unpaid (datum_valute, status),
  CONSTRAINT fk_inv_sub    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)   ON DELETE CASCADE,
  CONSTRAINT fk_inv_client FOREIGN KEY (client_id)       REFERENCES billing_clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Queue za background poslove (Loopia URL-cron vrti worker) ───────────────
CREATE TABLE IF NOT EXISTS billing_jobs (
  id            BIGINT        AUTO_INCREMENT PRIMARY KEY,
  type          VARCHAR(48)   NOT NULL,   -- issue_invoice | sync_provider | ...
  payload       JSON          NULL,
  status        VARCHAR(16)   NOT NULL DEFAULT 'queued',  -- queued|running|done|failed|dead
  attempts      INT           NOT NULL DEFAULT 0,
  max_attempts  INT           NOT NULL DEFAULT 5,
  run_after     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at     DATETIME      NULL,
  locked_by     VARCHAR(64)   NULL,
  last_error    TEXT          NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_job_pick (status, run_after)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Audit svih promena stanja i događaja (sa razlogom) ──────────────────────
CREATE TABLE IF NOT EXISTS billing_events (
  id              BIGINT      AUTO_INCREMENT PRIMARY KEY,
  subscription_id CHAR(36)    NULL,
  invoice_id      BIGINT      NULL,
  type            VARCHAR(48) NOT NULL,   -- state_change | invoice_sent | payment_matched | ...
  reason          VARCHAR(255) NULL,
  payload         JSON        NULL,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_event_sub (subscription_id),
  KEY idx_event_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Webhook idempotencija (Standard Webhooks) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id      VARCHAR(64)  PRIMARY KEY,  -- webhook event id
  event_type    VARCHAR(64)  NOT NULL,
  payload       JSON         NULL,
  processed_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Bankovni izvod (camt.053) — uparivanje uplata ───────────────────────────
-- Nepoklapanje iznosa NE zatvara fakturu automatski: status='review'.
CREATE TABLE IF NOT EXISTS bank_transactions (
  id                 BIGINT        AUTO_INCREMENT PRIMARY KEY,
  import_ref         VARCHAR(96)   NOT NULL,   -- jedinstveni id stavke iz izvoda
  datum              DATE          NOT NULL,
  iznos              DECIMAL(12,2) NOT NULL,
  poziv_na_broj      VARCHAR(32)   NULL,
  nalogodavac        VARCHAR(255)  NULL,
  raw                JSON          NULL,
  matched_invoice_id BIGINT        NULL,
  status             VARCHAR(16)   NOT NULL DEFAULT 'unmatched', -- matched|unmatched|review
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_import_ref (import_ref),   -- zaštita od duplog uvoza
  KEY idx_bt_pnb (poziv_na_broj),
  KEY idx_bt_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
