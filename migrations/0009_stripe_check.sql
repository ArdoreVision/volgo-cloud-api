-- Laatste keer dat de abonnementsstatus bij Stripe is gecontroleerd (opzeggingen oppikken).
ALTER TABLE gebruikers ADD COLUMN stripe_check TEXT;
