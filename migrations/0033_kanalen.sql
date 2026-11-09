-- Channels: WhatsApp and phone next to the website chat.
-- Click buttons (wa.me / tel:) only need the business number. Receiving messages and calls
-- automatically needs a provider: WhatsApp Business Platform (Meta) and Twilio for phone/SMS.
ALTER TABLE ava_instellingen ADD COLUMN zakelijk_nummer TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_instellingen ADD COLUMN knop_whatsapp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ava_instellingen ADD COLUMN knop_bellen INTEGER NOT NULL DEFAULT 0;
-- Meta "phone number ID" of this business's WhatsApp number on the Volgo WhatsApp app (set by Volgo after verification).
ALTER TABLE ava_instellingen ADD COLUMN wa_phone_id TEXT NOT NULL DEFAULT '';
-- Twilio number (E.164) that forwards calls to the business and catches missed calls and texts.
ALTER TABLE ava_instellingen ADD COLUMN twilio_nummer TEXT NOT NULL DEFAULT '';
ALTER TABLE ava_instellingen ADD COLUMN sms_terug INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ava_instellingen ADD COLUMN kanalen_gezien INTEGER NOT NULL DEFAULT 0;
-- Integrations the business asked for ("whatsapp", "telefoon"), comma separated.
ALTER TABLE ava_instellingen ADD COLUMN kanaal_wens TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS ava_instellingen_wa ON ava_instellingen (wa_phone_id) WHERE wa_phone_id != '';
CREATE UNIQUE INDEX IF NOT EXISTS ava_instellingen_twilio ON ava_instellingen (twilio_nummer) WHERE twilio_nummer != '';

-- The customer's WhatsApp ID or phone number, so a new message continues the same conversation.
ALTER TABLE ava_gesprek_meta ADD COLUMN extern_id TEXT;
CREATE INDEX IF NOT EXISTS ava_gesprek_meta_extern ON ava_gesprek_meta (extern_id);

-- Every call through a Volgo number (answered or missed). Webhook retries are ignored via call_sid.
CREATE TABLE IF NOT EXISTS telefoon_oproepen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  call_sid TEXT NOT NULL UNIQUE,
  van TEXT NOT NULL,
  status TEXT NOT NULL,
  duur INTEGER NOT NULL DEFAULT 0,
  gesprek_id INTEGER,
  gemaakt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS telefoon_oproepen_team ON telefoon_oproepen (team_id, gemaakt);

-- Incoming WhatsApp messages already processed (Meta retries webhooks).
CREATE TABLE IF NOT EXISTS whatsapp_ontvangen (
  wamid TEXT PRIMARY KEY,
  gemaakt TEXT NOT NULL DEFAULT (datetime('now'))
);
