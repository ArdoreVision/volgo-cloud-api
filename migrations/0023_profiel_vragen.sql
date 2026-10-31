-- Five closed questions answered before the dashboard opens: what kind of business, who the customers are,
-- the next step after a request, typical lead time and AVA's tone. Stored as JSON.
ALTER TABLE ava_instellingen ADD COLUMN profiel TEXT NOT NULL DEFAULT '';
