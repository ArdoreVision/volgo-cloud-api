-- Phones and browsers that receive push notifications from the app (one row per device).
CREATE TABLE IF NOT EXISTS push_abonnementen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  gebruiker_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  apparaat TEXT NOT NULL DEFAULT '',
  gemaakt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS push_abonnementen_team ON push_abonnementen (team_id);
-- The app's own VAPID key pair, made once on first use.
CREATE TABLE IF NOT EXISTS push_sleutels (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  publiek TEXT NOT NULL,
  prive TEXT NOT NULL
);
