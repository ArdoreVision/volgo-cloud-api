# Volgo — verbeterronde november 2026

Branch: `verbeteringen-dashboard` (niets hiervan staat live; alleen `main` wordt uitgerold).
Vier commits bovenop de landingspagina-commit van 2 november. Geen herschrijving: bestaande gegevens, routes en functies blijven werken.

## 1. Onderzoek: wat werkte, wat niet

| Onderdeel | Bevinding | Status vóór | Status nu |
|---|---|---|---|
| AVA op thevolgo.app (verkoopchat) | Vertelde "Every plan: 7 days free, card required" en "unlimited team invites" terwijl de proefperiode is afgeschaft en Pro 5 gebruikers heeft. Ook de og-omschrijving zei "7 days free". | **Fout** | Plannen, limieten en betaalvoorwaarden komen uit `plans.ts` (`plannenVoorAva`, `BETAAL_TEKST`); regel toegevoegd: nooit een proef, korting of functie noemen die niet in die lijst staat. Meta-omschrijving en admin-tekst bijgewerkt. |
| Afspraak boeken via de chat | Vrij-controle en insert waren twee stappen; twee bezoekers tegelijk konden hetzelfde slot krijgen. "Te vroeg" was 120 min in de kalender en 60 min bij het boeken. | Gedeeltelijk | Eén `INSERT … WHERE NOT EXISTS` (atomair); zelfde regel voor tonen en boeken; alleen roostertijden; horizon 28 dagen. Unit-getest incl. gelijktijdige boekingen. |
| Handmatige afspraak in dashboard | Geen overlapcontrole, geen bezig-status, verwijderen zonder bevestiging. | Gedeeltelijk | Overlap wordt gemeld met "Save anyway"; bezig-status; verwijderen vraagt inline bevestiging; opgeslagen-melding. |
| Leads dubbel | Zelfde persoon via een nieuw gesprek (ander apparaat) werd een nieuwe lead. | Onbewezen → bevestigd | Zelfde e-mail/telefoon (genormaliseerd) binnen 90 dagen, lead nog open → gesprek hangt onder dezelfde lead, warmte max, status terug naar "New". |
| Stripe-webhooks | Bestonden niet; status werd hooguit elke 6 uur gepolld. | Ontbrak | `/api/stripe`: handtekening (HMAC, 5 min tolerantie), elk event één keer (`stripe_events`), subscription created/updated/deleted, invoice.paid/payment_failed. Poll blijft als vangnet. |
| Mislukte API-aanvraag ≠ leeg | Chats bleef op "Loading…", website/AVA-instellingen/editor/lead idem; fouten werden ingeslikt. | Fout | Laden / fout met "Try again" / echt leeg zijn drie aparte toestanden (`status.tsx`). |
| Voorbeelddata | 48 leads, 18 afspraken, 8 chats per nieuw account, zonder label; teller "nieuwe leads" telde ze mee; na verwijderen zou het opnieuw gezaaid worden. | Misleidend | Overal label "Sample"; tellers en meldingen alleen echt; Results legt uit dat samples meetellen; knop "Remove sample data" (Settings → Account) met `voorbeeld_weg`-vlag; verdwijnt sowieso bij het eerste echte gesprek. |
| Home vs Overview | Twee startpagina's: Home = groot AVA-invoerveld met wereldbol, Overview = de cijfers. | Verwarrend | Home = vandaag: bellen (warmste open leads met bel-/mailknop), afspraken vandaag + komend, chats die op een mens wachten, AVA-assistent, en de set-up-stappen zolang AVA niet live is. Overview heet nu Results (alleen cijfers + definities). |
| Tabblad na verversen | Ging verloren (state in geheugen). | Gedeeltelijk | Tab en sub-tab staan in de URL (`?tab=…&sub=…`); e-mails en het Stripe-portaal linken diep. |
| Formulieren | Geen waarschuwing bij weggaan, dubbele inzending mogelijk (uitnodiging), vage bevestiging. | Gedeeltelijk | `useOnopgeslagen`: browser- én tabwaarschuwing; bezig-status en foutmelding op Train AVA, agenda-instellingen, uitnodigen, afspraak, editor. |
| Tijdzone | Dashboard toonde alles in Europe/Amsterdam, ongeacht de ingestelde tijdzone van het bedrijf. | Fout bij andere tijdzone | `zetTijdzone(data.tijdzone)`: alle tijden/datums in de tijdzone van het bedrijf; afspraken blijven wandkloktijd. |
| Beschikbaarheid 7 dagen 00:00–23:00 | Accountinstelling, geen bug. | — | Niet gewijzigd; waarschuwing in de instellingen bij ≥7 dagen of ≥16 uur/dag. |
| "Book Without Call" | Door het account zelf ingestelde knoptekst (Appearance). | — | Niet gewijzigd; waarschuwing in de editor als de tekst "no/without call" zegt terwijl "Phone call" als afspraaktype aanstaat. |
| Engelse/gemengde tekst vóór Nederlands | Site is in het Engels geschreven; vertaling gebeurt in de browser ná laden. | Fout (flits) | Keuze in cookie `volgo_taal` (1 jaar) + localStorage; server zet `<html lang>`; pre-paint script verbergt de publieke pagina tot de eerste vertaalbatch staat (max 2,5 s); expliciete keuze gaat vóór browsertaal; vertaler ook op inlog-, betaal- en demopagina's. Dashboard nooit verborgen. |
| Engelstalige Austin-demo op NL-pagina | — | Fout voor NL | Nederlandse bezoekers zien Badkamerstudio Noordzee (bestond al als `badkamer.html`), met Nederlandse teksten en tips. De 48-seconden-video blijft Engels (zie open punten). |
| Toegankelijkheid | axe: contrast (accentblauw 4,49:1), onjuiste `tablist`-rol op filterknoppen, `aria-label` op `<i>`. | Gedeeltelijk | Accent `#0f66c2` (5,7:1), grijs `#60687a`, filtergroepen als `group` met `aria-pressed`, avatarkleuren ≥5:1, "Vandaag"-rood met contrast. axe: 0 overtredingen (WCAG 2.x A/AA, 9 pagina's). |
| Demo-aanvragen via de Volgo-chat | Gingen naar damienhanssens@outlook.com. | Inconsistent | Naar volgo.app@outlook.com, zoals alle andere meldingen. |
| Admin | Serverside afgeschermd via `ADMIN_EMAILS`; UI niet volledig beoordeeld. | — | Alleen autorisatie beoordeeld (in orde). Rest **niet beoordeeld**. |

## 2. Uitgevoerde controles en resultaten

- **Build + typecheck**: `vite build` en `tsc --noEmit` schoon.
- **Unit-tests (vitest, D1 op node:sqlite met de echte migraties)**: 16/16 geslaagd.
  - Tijdzone/DST: lokale tijd in Amsterdam en New York; zomertijdwissel 29 maart 2026 (02:00 bestaat niet) en 25 oktober 2026 (02:30 komt twee keer).
  - Kalender: alleen slots binnen openingstijden, gesloten dagen, ≥2 uur vooruit; boeking buiten tijden/rooster/horizon geweigerd; dubbele en overlappende boeking geweigerd; twee gelijktijdige boekingen → precies één wint; voorbeeldafspraken tellen niet mee.
  - Keten in basismodus: bericht → naam → contact (ongeldige invoer afgewezen) → toestemming → lead (warmte ≥75), voorbeelddata weg; boeking op dezelfde lead; terugkomer met ander apparaat → geen tweede lead; na overname door een mens zwijgt AVA.
  - Stripe-webhook: geldige/ongeldige/verlopen handtekening; opzegging sluit account; betaling heropent; planwissel uit metadata; onbekend plan genegeerd; dubbel event genegeerd; onbekend abonnement raakt niets.
  - Plannen: AVA-tekst bevat exact de prijzen/limieten uit `plans.ts` en geen proefperiode.
- **End-to-end (Playwright tegen lokale `wrangler dev`, lokale D1, geen Stripe/Resend/Claude-sleutel)**: alle 11 stappen geslaagd — aanmelden via testbetaling → vijf vragen → Home met gelabelde voorbeelddata en zonder valse teller → Install-key, tab overleeft verversen → widget-gesprek → lead op Leads en Home (met `tel:`-link, teller 1, samples weg) → boeking, tweede poging geweigerd, slot "bezet" → afspraak in agenda, leadstatus "Appointment", nog steeds één lead → handmatige overlap gemeld en bewust opgeslagen → verwijderen vraagt bevestiging → onopgeslagen-waarschuwing bij tabwissel → taalcookie + `<html lang="nl">` → webhook weigert ongetekend (503 zonder secret).
- **Toegankelijkheid (axe-core, WCAG 2.0/2.1 A+AA)**: 0 overtredingen op /, /pricing, /login en zes dashboardpagina's.
- **Responsief**: geen horizontale scroll (documentbreedte) op 390, 820 en 1280 px voor /, /pricing, /login, /terms en alle dashboardtabs. Geen console-/paginafouten.
- **Taal**: SSR `<html lang="nl">` met cookie; verbergklasse aanwezig bij DOMContentLoaded en weg na vertaling; picker toont de keuze; dashboard nooit verborgen.

## 3. Niet getest / open punten

- **E-mails** (hete lead, nieuw gesprek, boeking, ochtendsamenvatting): lokaal geen Resend-sleutel. Code beoordeeld (ontvangers per voorkeur, max 20–30 per uur, links nu naar het juiste tabblad), niet verzonden.
- **Stripe live**: webhook werkt pas na het instellen van `STRIPE_WEBHOOK_SECRET` (zie §4); lokaal alleen getest met handtekeningen in de unit-test.
- **AVA met AI-sleutel**: lokaal draaide AVA in basismodus. Het systeemprompt van de klant-AVA verbiedt verzonnen prijzen/levertijden al; de verkoop-AVA krijgt nu de plannen uit één bron. Echte gesprekskwaliteit niet opnieuw gemeten.
- **Vertaalkwaliteit**: vertalingen komen uit de D1-cache/Claude; lokaal niet beschikbaar. Mechanisme (geen flits) getest, teksten zelf niet.
- **Installatiewidget op WordPress/Wix/Shopify e.d.**: niet getest op gastwebsites.
- **Toestemmingskeuze** (locatie alleen met akkoord): code beoordeeld (`koppel`, `slaViewOp`), niet end-to-end getest.
- **Widget na vernieuwen/opnieuw verbinden**: polling en localStorage-token beoordeeld; niet geautomatiseerd getest.
- **Admin-omgeving**: alleen autorisatie beoordeeld.
- **Demo-video** is Engels (Austin); een Nederlandse video is een productiestap.
- **Dashboard-taal**: het dashboard is en blijft Engels (eerdere keuze); alleen de publieke site wordt vertaald.
- Op de landingspagina overlapt de eigen AVA-knop van thevolgo.app de AVA-knop binnen de demo-iframe (bestond al).
- Analytics: "bezoekers" = som van unieke bezoekers per dag (dag-hash), dagen in UTC; eigen testverkeer wordt niet apart gehouden (geen uitsluitfunctie gebouwd).

## 4. Migraties, configuratie, terugrollen

- **Migratie** `0028_voorbeeld_webhooks.sql`: kolom `onboarding.voorbeeld_weg` en tabel `stripe_events`. Wordt automatisch toegepast door de deploy-workflow (`wrangler d1 migrations apply --remote`). Additief; oude code blijft werken met deze kolommen.
- **Nieuw secret (optioneel)** `STRIPE_WEBHOOK_SECRET`: in Stripe een endpoint `https://thevolgo.app/api/stripe` aanmaken met events `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`; het signing secret als GitHub Actions-secret zetten. Zonder secret antwoordt het endpoint 503 en blijft de 6-uurlijkse controle het enige kanaal.
- **Kleurwijziging**: accent `#1677d9` → `#0f66c2` (AA-contrast); de standaardkleur van de AVA-widget van klanten (`ava_instellingen.kleur`) is bewust niet veranderd.
- **Terugrollen**: `main` is onaangeroerd; niet mergen = niets veranderd. Na een merge: `git revert` van de vier commits (of `git revert 1c8060a 8f30d69 c36b4bb 7c49777`) en opnieuw pushen; de migratie kan blijven staan (additief), of handmatig `DROP TABLE stripe_events` — de kolom laten staan.
- **Lokaal draaien**: `npx wrangler d1 migrations apply volgo-db --local`, dan `npx wrangler dev --port 8787 --local --host localhost` (zonder `--host` stuurt de http→https-regel alles door). Tests: `npm test` (unit) en `npm run test:e2e` (Playwright, zie `test/e2e/README.md`).

## 5. Aanvulling 3 november: advertentiemeting

- Widget leest bij de eerste pagina `utm_source/medium/campaign/term/content` én Meta's `campaign_name`, `adset_name`, `ad_name`, `placement` (plus `fbclid`/`gclid`, alleen met toestemming) en houdt ze de hele sessie vast.
- Opgeslagen in `site_views` (migratie `0029_advertenties.sql`); elk gesprek/lead krijgt een notitie "Facebook · campagne · adset · ad · plaatsing" (zichtbaar in Leads en leaddetail).
- Website traffic → **Ads**: per advertentie bezoeken, tijd, scroll, aandeel mobiel, chat geopend, leads, boekingen; plaatsingen; waar ad-bezoekers zitten (stad met toestemming, anders land); wat ze AVA vroegen.
- Pixel-events `Lead` en `Schedule` worden afgevuurd als de site een pixel heeft geladen (op thevolgo.app alleen na akkoord).
- Getest: `test/e2e/advertenties.cjs` (twee gesimuleerde ad-bezoekers, één met chat en lead) — geslaagd. Leeftijd/geslacht/interesses zijn alleen in Meta Ads Manager te zien.
