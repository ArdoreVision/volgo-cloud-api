# Volgo voor Shopify (app met één schakelaar)

Hiermee zet een Shopify-winkel Volgo aan zonder code te plakken: app installeren,
schakelaar "Volgo chat" aanzetten in de thema-editor, Volgo-key invullen, opslaan.

Deze map staat los van de Volgo-website. Hij wordt niet meegebouwd en niet automatisch
online gezet; je zet hem zelf één keer op Shopify.

## Status
Nog niet getest bij Shopify: daarvoor is een Shopify Partner-account nodig.

## Eenmalig opzetten
1. Maak een gratis Partner-account op https://partners.shopify.com en maak daar een app "Volgo".
2. Installeer de Shopify CLI: `npm install -g @shopify/cli`
3. In deze map: `shopify app config link` en kies de app uit stap 1. Dit vult `client_id` in.
4. `shopify app deploy` zet de schakelaar "Volgo chat" online.

## Wie kan de app installeren
- **Eigen winkel of één klant:** kies in het Partner-dashboard "Custom distribution".
  Je krijgt een installatielink voor precies één winkel.
- **Alle klanten:** kies "Public distribution". Shopify beoordeelt de app eerst; dat duurt
  dagen tot weken. De app mag "unlisted" blijven: dan staat hij niet in de App Store, maar
  werkt je installatielink voor iedereen.

## Wat de klant doet
1. Op de installatielink klikken en de app installeren.
2. Online Store → Themes → Customize → App embeds → "Volgo chat" aanzetten.
3. De Volgo-key invullen (de code achter `data-key` in de installatieregel uit het dashboard) en op Save klikken.
