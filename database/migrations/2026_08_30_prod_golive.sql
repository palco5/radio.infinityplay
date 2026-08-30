-- ============================================================================
-- InfinityPlay — PRODUKCIJA GO-LIVE (jednokratno, idempotentno)
-- ============================================================================
-- Pusti OVAJ fajl u Loopia phpMyAdmin nad bazom `infinityplay_rs_db_1` PRE
-- nego što novi kod ode uživo. Sadrži sve što nedostaje na živoj bazi:
--   1) nove kolone na `profiles` (trial pečat + Polar provider polja)
--   2) sve billing tabele (kartica Polar + faktura)
--   3) registar firmi (auto-popuna po matičnom broju)
--
-- NAPOMENA: `user_blacklist` se automatski kreira iz api/blacklist.php pri prvom
-- pozivu, pa nije ovde. NE puštaj 2026_08_21_polar_generic.sql — te izmene su već
-- ugrađene u sveže tabele ispod (paddle->provider), pa bi pucao na praznoj bazi.
--
-- Bezbedno je pustiti više puta: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.
-- ============================================================================

-- ── 1) profiles: nove kolone (stare se preskaču zbog IF NOT EXISTS) ──────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_started_at         DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS subscription_ends_at     DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end     TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_customer_id     VARCHAR(64)  NULL,
  ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(64)  NULL;

-- ── 2) Billing: firme kojima se izdaje faktura ──────────────────────────────
CREATE TABLE IF NOT EXISTS billing_clients (
  id                CHAR(36)      PRIMARY KEY,
  user_id           CHAR(36)      NOT NULL,
  naziv             VARCHAR(255)  NOT NULL,
  pib               CHAR(9)       NOT NULL,
  maticni_broj      CHAR(8)       NOT NULL,
  adresa            VARCHAR(255)  NOT NULL,
  grad              VARCHAR(120)  NOT NULL,
  postanski_broj    VARCHAR(16)   NOT NULL,
  email             VARCHAR(255)  NOT NULL,
  telefon           VARCHAR(40)   NULL,
  kontakt_osoba     VARCHAR(160)  NULL,
  u_sistemu_pdv     TINYINT(1)    NOT NULL DEFAULT 1,
  drzava            CHAR(2)       NOT NULL DEFAULT 'RS',
  sef_registered    TINYINT(1)    NOT NULL DEFAULT 1,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_client_user_pib (user_id, pib),
  KEY idx_client_user (user_id),
  CONSTRAINT fk_client_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Pretplate — jedinstven state machine za karticu i fakturu ────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    CHAR(36)      PRIMARY KEY,
  user_id               CHAR(36)      NOT NULL,
  client_id             CHAR(36)      NULL,
  payment_method        VARCHAR(16)   NOT NULL DEFAULT 'faktura',
  plan                  VARCHAR(50)   NOT NULL,
  ciklus                VARCHAR(16)   NOT NULL DEFAULT 'godisnje',
  broj_lokacija         INT           NOT NULL DEFAULT 1,
  cena_po_lokaciji      DECIMAL(12,2) NOT NULL DEFAULT 0,
  setup_fee             DECIMAL(12,2) NOT NULL DEFAULT 0,
  setup_fee_naplacen    TINYINT(1)    NOT NULL DEFAULT 0,
  currency              CHAR(3)       NOT NULL DEFAULT 'RSD',
  state                 VARCHAR(24)   NOT NULL DEFAULT 'trialing',
  trial_ends_at         DATETIME      NULL,
  current_period_start  DATETIME      NULL,
  current_period_end    DATETIME      NULL,
  access_until          DATETIME      NULL,
  next_billing_date     DATE          NULL,
  cancel_at_period_end  TINYINT(1)    NOT NULL DEFAULT 0,
  provider_customer_id     VARCHAR(64) NULL,
  provider_subscription_id VARCHAR(64) NULL,
  billing_provider         VARCHAR(20) NULL,
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

-- ── Atomični brojač za brojeve faktura ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_counters (
  year      INT NOT NULL PRIMARY KEY,
  last_seq  INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Fakture ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                  BIGINT        AUTO_INCREMENT PRIMARY KEY,
  subscription_id     CHAR(36)      NOT NULL,
  client_id           CHAR(36)      NOT NULL,
  broj_fakture        VARCHAR(32)   NOT NULL,
  period_key          VARCHAR(16)   NOT NULL,
  datum_izdavanja     DATE          NOT NULL,
  datum_valute        DATE          NOT NULL,
  datum_prometa       DATE          NOT NULL,
  poziv_na_broj       VARCHAR(32)   NOT NULL,
  poziv_na_broj_ips   VARCHAR(32)   NOT NULL,
  osnovica            DECIMAL(12,2) NOT NULL,
  pdv                 DECIMAL(12,2) NOT NULL,
  ukupno              DECIMAL(12,2) NOT NULL,
  valuta              CHAR(3)       NOT NULL DEFAULT 'RSD',
  stavke              JSON          NOT NULL,
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
  UNIQUE KEY uq_invoice_period (subscription_id, period_key),
  KEY idx_invoice_pnb (poziv_na_broj),
  KEY idx_invoice_unpaid (datum_valute, status),
  CONSTRAINT fk_inv_sub    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)   ON DELETE CASCADE,
  CONSTRAINT fk_inv_client FOREIGN KEY (client_id)       REFERENCES billing_clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Queue za background poslove ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_jobs (
  id            BIGINT        AUTO_INCREMENT PRIMARY KEY,
  type          VARCHAR(48)   NOT NULL,
  payload       JSON          NULL,
  status        VARCHAR(16)   NOT NULL DEFAULT 'queued',
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

-- ── Audit događaja ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_events (
  id              BIGINT      AUTO_INCREMENT PRIMARY KEY,
  subscription_id CHAR(36)    NULL,
  invoice_id      BIGINT      NULL,
  type            VARCHAR(48) NOT NULL,
  reason          VARCHAR(255) NULL,
  payload         JSON        NULL,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_event_sub (subscription_id),
  KEY idx_event_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Webhook idempotencija ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id      VARCHAR(64)  PRIMARY KEY,
  event_type    VARCHAR(64)  NOT NULL,
  payload       JSON         NULL,
  processed_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Bankovni izvod (camt.053) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_transactions (
  id                 BIGINT        AUTO_INCREMENT PRIMARY KEY,
  import_ref         VARCHAR(96)   NOT NULL,
  datum              DATE          NOT NULL,
  iznos              DECIMAL(12,2) NOT NULL,
  poziv_na_broj      VARCHAR(32)   NULL,
  nalogodavac        VARCHAR(255)  NULL,
  raw                JSON          NULL,
  matched_invoice_id BIGINT        NULL,
  status             VARCHAR(16)   NOT NULL DEFAULT 'unmatched',
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_import_ref (import_ref),
  KEY idx_bt_pnb (poziv_na_broj),
  KEY idx_bt_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3) Registar firmi (auto-popuna po matičnom broju) ───────────────────────
CREATE TABLE IF NOT EXISTS company_registry (
  maticni_broj  CHAR(8)      NOT NULL PRIMARY KEY,
  naziv         VARCHAR(512) NOT NULL,
  opstina       VARCHAR(120) NOT NULL DEFAULT '',
  status        VARCHAR(60)  NOT NULL DEFAULT '',
  pravna_forma  VARCHAR(160) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
