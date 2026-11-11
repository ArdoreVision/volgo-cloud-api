-- Keep Damien's number off Volgo's own chat widget (no WhatsApp/call chips).
UPDATE ava_instellingen SET knop_whatsapp = 0, knop_bellen = 0 WHERE sleutel = 'c2c0abaa339e5c0a8c9e4064';
