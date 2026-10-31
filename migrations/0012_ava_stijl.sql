-- Eigen stijl voor de AVA-chat (Pro en Premium): foto, positie, thema, vorm, lettertype, knoptekst, zonder Volgo-vermelding.
CREATE TABLE IF NOT EXISTS ava_stijl (
  team_id INTEGER PRIMARY KEY,
  avatar TEXT,
  positie TEXT NOT NULL DEFAULT 'rechts',
  thema TEXT NOT NULL DEFAULT 'licht',
  vorm TEXT NOT NULL DEFAULT 'rond',
  lettertype TEXT NOT NULL DEFAULT 'systeem',
  knoptekst TEXT NOT NULL DEFAULT '',
  branding INTEGER NOT NULL DEFAULT 0
);
