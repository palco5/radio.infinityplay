-- ============================================================================
-- Registar firmi (APR evidencija) — za auto-popunu naziva/grada po matičnom broju.
-- Podaci se uvoze iz companies.json (ključ = matični broj). Nema PIB-a ni adrese.
-- ============================================================================
-- Nazivi firmi umeju biti veoma dugi (do ~400 znakova) -> VARCHAR(512).
-- Pretraga ide samo po matičnom broju (PK), pa nema indeksa na nazivu.
CREATE TABLE IF NOT EXISTS company_registry (
  maticni_broj  CHAR(8)      NOT NULL PRIMARY KEY,
  naziv         VARCHAR(512) NOT NULL,
  opstina       VARCHAR(120) NOT NULL DEFAULT '',  -- latinica (transliterovano iz ćirilice)
  status        VARCHAR(60)  NOT NULL DEFAULT '',
  pravna_forma  VARCHAR(160) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
