# Spotter

AI DM setter for online fitness coaches. A service of Hanssens Cornerstone Capital.
This branch (`spotter`) is its own app: worker `spotter`, database `spotter-db`. Volgo on `main` is not touched.

## How it goes live
Every push to `spotter` deploys via `.github/workflows/spotter.yml`, then checks the live site,
runs a real demo chat with Claude and saves `STATUS.md` + screenshots in `status/`.

## Keys (GitHub > Settings > Secrets and variables > Actions)
Already shared with Volgo: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `PUSH_TOPIC`.
Needed for Instagram: `META_APP_ID`, `META_APP_SECRET` (from the Meta app, see below). Without them coaches can
still sign up, pay and test; the Instagram page then lets them request a done-for-you connection.

## Meta app (one time)
1. developers.facebook.com → Create app → type Business → add product "Instagram" → "API setup with Instagram login".
2. Webhook callback URL: `<address>/webhook/instagram`, verify token `spotter-verify-2026`, subscribe to `messages`.
3. Business login redirect URL: `<address>/connect/instagram/callback`.
4. Privacy policy `<address>/privacy`, terms `<address>/terms`, data deletion callback `<address>/data-deletion`.
5. Put the Instagram App ID and App secret in GitHub secrets `META_APP_ID` / `META_APP_SECRET`, re-run the workflow.
6. Until App Review approves `instagram_business_manage_messages`, add each coach's Instagram account as a tester (App roles).

## Local test
`npm install`, `node test/mock.mjs &`, `npx wrangler d1 migrations apply spotter-db --local`, `npx wrangler dev --test-scheduled`, `node test/e2e.mjs`.
