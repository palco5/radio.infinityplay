-- ============================================================================
-- Prelazak sa Paddle na Polar — provajder-agnostične kolone.
-- Umesto paddle_* kolona koristimo generičke provider_* + billing_provider,
-- da buduća zamena provajdera ne dira nazive kolona.
-- CHANGE COLUMN radi i na starijim MariaDB verzijama (za razliku od RENAME COLUMN).
-- ============================================================================

-- profiles: paddle_* -> provider_*
ALTER TABLE profiles
  CHANGE COLUMN paddle_customer_id     provider_customer_id     VARCHAR(64) NULL,
  CHANGE COLUMN paddle_subscription_id provider_subscription_id VARCHAR(64) NULL;

-- subscriptions: paddle_* -> provider_*, + billing_provider ('polar' | NULL za fakturu)
ALTER TABLE subscriptions
  CHANGE COLUMN paddle_customer_id     provider_customer_id     VARCHAR(64) NULL,
  CHANGE COLUMN paddle_subscription_id provider_subscription_id VARCHAR(64) NULL;

ALTER TABLE subscriptions
  ADD COLUMN billing_provider VARCHAR(20) NULL AFTER payment_method;

-- Indeks paddle -> provider
ALTER TABLE subscriptions DROP INDEX idx_sub_paddle;
ALTER TABLE subscriptions ADD INDEX idx_sub_provider (provider_subscription_id);

-- Postojeće kartične pretplate: payment_method 'paddle' -> 'card', provider 'polar'.
UPDATE subscriptions SET payment_method = 'card', billing_provider = 'polar'
  WHERE payment_method = 'paddle';
