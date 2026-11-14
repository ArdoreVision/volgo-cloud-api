# Volgo

Volgo: de afspraak-setter voor in je eigen website. Eén regel code plakken; Volgo antwoordt bezoekers, stelt je vragen en plant de afspraak.
Een dienst van Hanssens Cornerstone Capital.

## Hoe het online komt
Elke wijziging op `main` wordt automatisch gebouwd en op Cloudflare gezet
(zie `.github/workflows/deploy.yml`). De database (D1) wordt automatisch aangemaakt
en bijgewerkt.

## Geheimen (GitHub > Settings > Secrets and variables > Actions)
| Naam | Nodig | Waarvoor |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ja | Online zetten op Cloudflare (Workers + D1 Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ja | Je Cloudflare-account |
| `ANTHROPIC_API_KEY` | aanrader | Volgo voert echte gesprekken met Claude |
| `RESEND_API_KEY` | optioneel | E-mails (aanvragen, meldingen, uitnodigingen) |
| `STRIPE_SECRET_KEY` | optioneel | Echte abonnementsbetalingen |

Klanten hoeven nooit iets in te stellen: deze sleutels gelden voor het hele platform.
