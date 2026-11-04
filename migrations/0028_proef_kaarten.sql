-- One free trial per payment method: the card/bank fingerprint of every trial is remembered.
CREATE TABLE IF NOT EXISTS proef_kaarten (
  fingerprint TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  stripe_abonnement TEXT
);
