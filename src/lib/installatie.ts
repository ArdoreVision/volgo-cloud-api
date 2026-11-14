/**
 * Where to paste the one Volgo line, per website platform. One list for the landing page and the dashboard,
 * so the steps a visitor reads before buying are exactly the steps they follow after.
 */
export const PLATFORMS: { id: string; naam: string; stappen: string[]; noot?: string }[] = [
  {
    id: "wordpress",
    naam: "WordPress",
    stappen: ["Install the free plugin “WPCode” (Plugins → Add New).", "Go to Code Snippets → Header & Footer.", "Paste the line in the Footer box and click Save Changes."],
    noot: "The first time with WordPress takes a little longer, about 2 minutes: you install the free plugin first.",
  },
  {
    id: "wix",
    naam: "Wix",
    stappen: ["Open Settings → Custom Code (under Advanced).", "Click + Add Custom Code and paste the line.", "Choose All pages, place it in Body - end and click Apply."],
    noot: "Wix needs a paid plan with your own domain for this.",
  },
  {
    id: "shopify",
    naam: "Shopify",
    stappen: ["Open Online Store → Themes → … → Edit code.", "Open theme.liquid and paste the line just above </body>.", "Click Save."],
  },
  {
    id: "squarespace",
    naam: "Squarespace",
    stappen: ["Open Settings → Advanced → Code injection.", "Paste the line in the Footer box.", "Click Save."],
    noot: "Code injection is part of the Core plan and higher.",
  },
  {
    id: "webflow",
    naam: "Webflow",
    stappen: ["Open Site settings → Custom code.", "Paste the line under Footer code.", "Save and publish your site."],
    noot: "Custom code needs a paid Webflow site plan.",
  },
  {
    id: "framer",
    naam: "Framer",
    stappen: ["Open Site Settings → General → Custom Code.", "Paste the line under End of <body> tag.", "Click Save and publish your site."],
    noot: "Custom code needs a paid Framer plan.",
  },
  {
    id: "lovable",
    naam: "Lovable",
    stappen: ["Open your project in Lovable.", "Type in the chat: “Put this line just above </body> in index.html” and paste the line after it.", "Click Publish."],
  },
  {
    id: "anders",
    naam: "Other / HTML",
    stappen: [
      "Paste the line just above </body> on every page (or in the footer template of your site).",
      "Save and publish.",
      "Can't find it? Send the line to whoever made your website. It takes them two minutes.",
    ],
  },
];

/** How long pasting the line takes, as shown on the landing page and in the dashboard. An estimate: copy, paste, save. */
export const INSTALL_SECONDEN = 60;
/** How long the whole setup takes when you do it yourself: account, five questions, opening hours, paste the line, check. An estimate. */
export const INSTALL_MINUTEN = 10;

/** The kinds of websites Volgo is built for: any site where you can paste one line of code. */
export const WEBSITE_SOORTEN = ["WordPress", "Wix", "Shopify", "Squarespace", "Webflow", "Framer", "Lovable", "Custom HTML"];

/** The one line a business pastes into its website. */
export const installRegel = (origin: string, sleutel: string) => `<script src="${origin}/ava.js" data-key="${sleutel}" defer></script>`;
