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

## Eigen domein van een klant
Elke klant vult bij het aanmelden zijn eigen domein in. De klant laat `www` als CNAME wijzen naar `sites.thevolgo.app`.
Om die bezoekers bij Volgo te laten uitkomen is eenmalig dit nodig in Cloudflare (zone `thevolgo.app`):

1. **SSL/TLS → Custom Hostnames** aanzetten (Cloudflare for SaaS; de eerste 100 domeinen zijn gratis).
2. Een DNS-record `sites` maken (AAAA `100::`, proxy aan) en dat instellen als **Fallback Origin**.
3. Een Worker-route `*/*` op de zone `thevolgo.app` naar de Worker `volgo`, zodat verkeer op klantdomeinen bij de app komt.
4. Per klantdomein een Custom Hostname toevoegen voor `www.<domein>`. Dit gaat vanzelf als deze twee geheimen bestaan:

| Naam | Waarvoor |
|---|---|
| `CF_SAAS_ZONE_ID` | Zone-ID van `thevolgo.app` |
| `CF_SAAS_TOKEN` | API-token met het recht "SSL and Certificates: Edit" op die zone |

Zonder die geheimen krijg je per nieuw domein een mail op volgo.app@outlook.com en voeg je het domein met de hand toe.
Zodra de eerste bezoeker via het domein binnenkomt, springt de status bij de klant vanzelf op "Connected".
Tot die tijd staat de website online op `thevolgo.app/s/<naam>`.
