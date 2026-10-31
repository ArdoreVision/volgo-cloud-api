-- Profile: photo (small data URL, resized in the browser) and what you do.
ALTER TABLE gebruikers ADD COLUMN foto TEXT;
ALTER TABLE gebruikers ADD COLUMN functie TEXT;
