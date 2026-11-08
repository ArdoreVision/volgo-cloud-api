CREATE TABLE coaches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',          -- new | trial | active | past_due | canceled | free
  stripe_customer TEXT,
  stripe_sub TEXT,
  trial_end TEXT,
  profile TEXT NOT NULL DEFAULT '{}',          -- setter answers (json)
  setter_on INTEGER NOT NULL DEFAULT 1,
  ig_user_id TEXT,                             -- IG professional account id (webhook entry.id)
  ig_username TEXT,
  ig_token TEXT,
  ig_token_exp TEXT,
  reset_hash TEXT,
  reset_exp TEXT,
  last_report TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX coaches_ig ON coaches(ig_user_id);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  coach_id INTEGER NOT NULL,
  expires TEXT NOT NULL
);

CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL,
  ig_sender_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'new',           -- new | qualifying | link_sent | booked | not_fit | needs_you
  paused INTEGER NOT NULL DEFAULT 0,
  brief TEXT NOT NULL DEFAULT '',
  last_lead_at TEXT,
  last_out_at TEXT,
  followup_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (coach_id, ig_sender_id)
);
CREATE INDEX leads_coach ON leads(coach_id, updated_at);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  role TEXT NOT NULL,                          -- lead | bot | coach
  text TEXT NOT NULL,
  mid TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX messages_lead ON messages(lead_id, id);
CREATE UNIQUE INDEX messages_mid ON messages(mid) WHERE mid IS NOT NULL;

CREATE TABLE demo_hits (
  ip TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, day)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER,
  kind TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
