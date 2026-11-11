ALTER TABLE coaches ADD COLUMN notify_email INTEGER NOT NULL DEFAULT 1;
ALTER TABLE leads ADD COLUMN source TEXT NOT NULL DEFAULT 'dm';
CREATE TABLE comment_replies (
  comment_id TEXT PRIMARY KEY,
  coach_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
