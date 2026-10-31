-- Until now only a Stripe test key was used: mark those subscriptions as test, so they never count as revenue after going live.
UPDATE gebruikers SET testmodus = 1 WHERE COALESCE(stripe_abonnement, '') != '';
UPDATE betalingen SET testmodus = 1 WHERE COALESCE(stripe_abonnement, '') != '';
