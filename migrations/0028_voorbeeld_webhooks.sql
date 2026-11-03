-- The owner removed the sample data on purpose: never seed it again for this team.
ALTER TABLE onboarding ADD COLUMN voorbeeld_weg INTEGER NOT NULL DEFAULT 0;
-- Stripe webhook events that were already processed (Stripe retries, and may deliver an event twice).
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
