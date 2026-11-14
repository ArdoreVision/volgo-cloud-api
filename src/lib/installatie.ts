/**
 * Where to paste the one Volgo line, per website platform. One list for the landing page and the dashboard,
 * so the steps a visitor reads before buying are exactly the steps they follow after.
 */
export const PLATFORMS: { id: string; naam: string; stappen: string[]; noot?: string }[] = [
  {
    id: "wordpress",
    naam: "WordPress",
    stappen: ["Download your Volgo plugin in your dashboard. Your code is already in it, so there is nothing to paste.", "In WordPress go to Plugins → Add New → Upload Plugin and choose volgo.zip.", "Click Install Now, then Activate."],
    noot: "Does your website use a cache plugin? Clear the cache once, so the chat shows up straight away.",
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
    stappen: ["Open the code of your live theme: Online Store → Themes → … → Edit code → theme.liquid. Your dashboard has a button that opens it in one click.", "Scroll to the bottom and paste the line just above </body>.", "Click Save."],
    noot: "A theme preview in your browser can show another theme without Volgo. Look at your shop in a private window to see the live one.",
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

/**
 * One click to the right file in Shopify. Every Shopify shop forwards <its own domain>/admin/... to its admin,
 * and "themes/current" is the published theme, so this opens theme.liquid of the live theme without the owner
 * having to find it. Returns "" when the saved address is not a usable web address.
 */
export function shopifyCodeLink(siteUrl: string): string {
  try {
    const u = new URL(siteUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return `https://${u.host}/admin/themes/current?key=layout/theme.liquid`;
  } catch {
    return "";
  }
}

/** The page in WordPress where a plugin zip is uploaded, for the website at this address. "" when the address is unusable. */
export function wordpressUploadLink(siteUrl: string): string {
  try {
    const u = new URL(siteUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return `https://${u.host}/wp-admin/plugin-install.php?tab=upload`;
  } catch {
    return "";
  }
}

/**
 * What a website is made with, read from its own page. Each platform leaves marks in the HTML (where its files
 * come from, a "generator" tag). Returns a PLATFORMS id, or "" when it cannot tell: then the owner chooses.
 */
export function herkenPlatform(html: string, headers?: { get(naam: string): string | null }): string {
  const h = html.slice(0, 600_000);
  const kop = (n: string) => headers?.get(n) ?? "";
  const gen = (h.match(/<meta[^>]+name=["']generator["'][^>]*>/i)?.[0] ?? "").toLowerCase();
  if (kop("x-shopid") || kop("x-shopify-stage") || /cdn\.shopify\.com|Shopify\.theme\s*=|\.myshopify\.com/.test(h)) return "shopify";
  if (kop("x-wix-request-id") || gen.includes("wix.com") || /static\.(wixstatic|parastorage)\.com/.test(h)) return "wix";
  if (gen.includes("squarespace") || /static1\.squarespace\.com|squarespace-cdn\.com/.test(h)) return "squarespace";
  if (gen.includes("webflow") || /data-wf-site=|website-files\.com|assets\.webflow\.com/.test(h)) return "webflow";
  if (gen.includes("framer") || /framerusercontent\.com|events\.framer\.com/.test(h)) return "framer";
  if (/lovable\.app|lovable-uploads|cdn\.gpteng\.co/.test(h)) return "lovable";
  if (gen.includes("wordpress") || /\/wp-(content|includes)\//.test(h)) return "wordpress";
  return "";
}
