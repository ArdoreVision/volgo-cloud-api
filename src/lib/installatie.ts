/**
 * Where to paste the one Volgo line, per website platform. One list for the landing page and the dashboard,
 * so the steps a visitor reads before buying are exactly the steps they follow after.
 */
export const PLATFORMS: { id: string; naam: string; stappen: string[]; noot?: string }[] = [
  {
    id: "wordpress",
    naam: "WordPress",
    stappen: ["Installeer de gratis plugin “WPCode” (Plugins → Nieuwe plugin).", "Ga naar Code Snippets → Header & Footer.", "Plak de regel in het vak Footer en klik op Save."],
  },
  {
    id: "wix",
    naam: "Wix",
    stappen: ["Open Instellingen → Aangepaste code (onder Geavanceerd).", "Klik op + Aangepaste code toevoegen en plak de regel.", "Kies Alle pagina's, plaats het in Body - einde en klik op Toepassen."],
    noot: "Wix vraagt hiervoor een betaald pakket met een eigen domein.",
  },
  {
    id: "shopify",
    naam: "Shopify",
    stappen: ["Open Online Store → Thema's → … → Code bewerken.", "Open theme.liquid en plak de regel net boven </body>.", "Klik op Opslaan."],
  },
  {
    id: "squarespace",
    naam: "Squarespace",
    stappen: ["Open Settings → Advanced → Code injection.", "Plak de regel in het vak Footer.", "Klik op Opslaan."],
    noot: "Code injection zit in het Core-pakket en hoger.",
  },
  {
    id: "webflow",
    naam: "Webflow",
    stappen: ["Open Site settings → Custom code.", "Plak de regel bij Footer code.", "Opslaan en je site publiceren."],
    noot: "Custom code vraagt een betaald Webflow-siteplan.",
  },
  {
    id: "anders",
    naam: "Anders / HTML",
    stappen: [
      "Plak de regel net boven </body> op elke pagina (of in de footer-template van je site).",
      "Opslaan en publiceren.",
      "Kun je het niet vinden? Stuur de regel naar wie je website maakte, dat kost hen twee minuten.",
    ],
  },
];

/** The one line a business pastes into its website. */
export const installRegel = (origin: string, sleutel: string) => `<script src="${origin}/ava.js" data-key="${sleutel}" defer></script>`;
