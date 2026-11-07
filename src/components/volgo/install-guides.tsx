/** Step-by-step: where to paste the Volgo line on each website platform. Used on /pricing and in the dashboard. */
export const GIDSEN: { id: string; naam: string; stappen: string[]; noot?: string }[] = [
  {
    id: "shopify",
    naam: "Shopify",
    stappen: [
      "In Shopify admin go to Online Store → Themes.",
      "Next to your live theme click ⋯ → Edit code.",
      "Open layout/theme.liquid.",
      "Paste the Volgo line just above </body> and click Save.",
    ],
  },
  {
    id: "wordpress",
    naam: "WordPress",
    stappen: [
      "Go to Plugins → Add New and install the free plugin “WPCode”.",
      "Open Code Snippets → Header & Footer.",
      "Paste the Volgo line in the Footer box.",
      "Click Save Changes.",
    ],
  },
  {
    id: "wix",
    naam: "Wix",
    stappen: [
      "In your site dashboard go to Settings → Custom Code.",
      "Click + Add Custom Code and paste the Volgo line.",
      "Choose All pages and place it in Body – end.",
      "Click Apply.",
    ],
    noot: "Wix needs a premium plan with a connected domain for custom code.",
  },
  {
    id: "squarespace",
    naam: "Squarespace",
    stappen: ["Go to Settings → Developer Tools → Code Injection.", "Paste the Volgo line in the Footer field.", "Click Save."],
    noot: "Code injection is available on the Core plan and higher.",
  },
  {
    id: "webflow",
    naam: "Webflow",
    stappen: ["Open Site settings → Custom code.", "Paste the Volgo line in Footer code.", "Click Save, then publish your site."],
    noot: "Custom code needs a paid Webflow site plan.",
  },
  {
    id: "anders",
    naam: "Other or custom built",
    stappen: ["Paste the Volgo line just before the closing </body> tag on every page (usually one shared layout or footer file).", "Save and publish."],
    noot: "Not sure? Send the line to whoever manages your website, or ask us to do it.",
  },
];

export function InstallGuides({ code }: { code?: string }) {
  return (
    <div className="v-gidsen">
      {GIDSEN.map((g) => (
        <details className="v-gids" key={g.id}>
          <summary>
            <span>{g.naam}</span>
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </summary>
          <ol>
            {g.stappen.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {g.noot ? <p className="v-gids__noot">{g.noot}</p> : null}
          {code ? <code className="v-gids__code">{code}</code> : null}
        </details>
      ))}
    </div>
  );
}
