-- By Intent Groups: team applicants get their own login after Damien approves them.
CREATE TABLE IF NOT EXISTS groep_leden (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,          -- the application's conversation token (quick-reply links)
  naam TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL,                   -- Cold caller / Closer / Web developer
  status TEXT NOT NULL DEFAULT 'wacht', -- wacht, goedgekeurd, afgewezen
  wachtwoord TEXT,                     -- pbkdf2 hash, only after approval
  gemaakt TEXT NOT NULL DEFAULT (datetime('now')),
  goedgekeurd TEXT
);
CREATE INDEX IF NOT EXISTS groep_leden_email ON groep_leden (email);
