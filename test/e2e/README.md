# End-to-end test

Draait tegen een lokale `wrangler dev` (lokale D1, geen Stripe-, Resend- of Claude-sleutel nodig: AVA werkt dan in basismodus en betalen is een testbetaling).

```
npx wrangler d1 migrations apply volgo-db --local
npx wrangler dev --port 8787 --local --host localhost
npm run test:e2e   # (playwright moet geïnstalleerd zijn: npm i -D playwright)
```

Er worden geen e-mails verstuurd en geen echte betalingen gedaan.
