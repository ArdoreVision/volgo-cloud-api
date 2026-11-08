import { useEffect, useState } from "react";

import { bewaarMijnWebsite, controleerInstallatie, haalMijnWebsite } from "@/lib/api/groei.functions";

type Data = Awaited<ReturnType<typeof haalMijnWebsite>>;

const PLATFORMS: { id: string; naam: string; stappen: string[] }[] = [
  {
    id: "wordpress",
    naam: "WordPress",
    stappen: [
      "Install the free plugin “WPCode” (Plugins → Add new).",
      "Go to Code Snippets → Header & Footer.",
      "Paste the code in the Footer box and click Save.",
    ],
  },
  { id: "wix", naam: "Wix", stappen: ["Open Settings → Custom code (under Advanced).", "Click + Add custom code and paste the code.", "Choose All pages, place it in Body - end, and click Apply."] },
  { id: "squarespace", naam: "Squarespace", stappen: ["Open Settings → Advanced → Code injection.", "Paste the code in the Footer box.", "Click Save."] },
  { id: "shopify", naam: "Shopify", stappen: ["Open Online Store → Themes → … → Edit code.", "Open theme.liquid and paste the code just above </body>.", "Click Save."] },
  { id: "webflow", naam: "Webflow", stappen: ["Open Site settings → Custom code.", "Paste the code in Footer code.", "Save and publish your site."] },
  { id: "anders", naam: "Other / HTML", stappen: ["Paste the code just above </body> on every page (or in your site's footer template).", "Save and publish.", "Can't find it? Send this page to whoever made your website, it takes them two minutes."] },
];

/** Your website: address, the code to install it yourself, and a live preview with your chat on it. */
export function MijnWebsite({ openTab }: { openTab: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [site, setSite] = useState("");
  const [review, setReview] = useState("");
  const [opgeslagen, setOpgeslagen] = useState<"" | "ok" | "fout">("");
  const [platform, setPlatform] = useState("wordpress");
  const [check, setCheck] = useState<"" | "bezig" | "ok" | "niet" | "geen" | "onbereikbaar">("");
  const [mobiel, setMobiel] = useState(false);
  const [versie, setVersie] = useState(0);
  const [gekopieerd, setGekopieerd] = useState("");

  useEffect(() => {
    void haalMijnWebsite()
      .then((x) => {
        setD(x);
        setSite(x.siteUrl);
        setReview(x.reviewUrl);
      })
      .catch(() => undefined);
  }, []);
  if (!d) return <p className="v-g__leeg">Loading…</p>;

  const origin = typeof window === "undefined" ? "https://thevolgo.app" : window.location.origin;
  const code = `<script src="${origin}/ava.js" data-key="${d.sleutel}" defer></script>`;
  const formulier = `<form action="${origin}/api/formulier/${d.sleutel}" method="post">
  <input name="naam" placeholder="Name" required>
  <input name="email" type="email" placeholder="Email" required>
  <input name="telefoon" placeholder="Phone">
  <textarea name="bericht" placeholder="Message" required></textarea>
  <input name="website" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">Send</button>
</form>`;
  const kopieer = (t: string, wat: string) => void navigator.clipboard.writeText(t).then(() => setGekopieerd(wat));

  async function bewaar() {
    let s = site.trim();
    if (s && !/^https?:\/\//.test(s)) s = `https://${s}`;
    const r = review.trim();
    if (r && !/^https:\/\//.test(r)) return setOpgeslagen("fout");
    const ok = await bewaarMijnWebsite({ data: { site_url: s, review_url: r } })
      .then(() => true)
      .catch(() => false);
    setOpgeslagen(ok ? "ok" : "fout");
    if (ok) {
      setSite(s);
      setD({ ...d!, siteUrl: s, reviewUrl: r });
      setVersie((v) => v + 1);
    }
  }
  async function controleer() {
    setCheck("bezig");
    const r = await controleerInstallatie().catch(() => ({ status: "onbereikbaar" as const }));
    setCheck(r.status);
  }
  const p = PLATFORMS.find((x) => x.id === platform)!;

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Your website</h1>
        <p>See your own website with your Volgo chat on it, exactly as visitors see it. Install it yourself in two minutes, no technical knowledge needed.</p>
      </header>

      <section className="v-g__kaart">
        <h2>Your details</h2>
        <div className="v-g__form">
          <label className="v-g__veld">
            Website address
            <input inputMode="url" onChange={(e) => setSite(e.target.value)} placeholder="https://www.yourbusiness.com" value={site} />
          </label>
          <label className="v-g__veld">
            Google review link
            <input inputMode="url" onChange={(e) => setReview(e.target.value)} placeholder="https://g.page/r/…/review" value={review} />
            <small>
              Find it in your Google Business Profile → <em>Ask for reviews</em> → copy the link.
            </small>
          </label>
          <div className="v-g__knoppen is-breed">
            <button className="v-g__knop" onClick={() => void bewaar()} type="button">
              Save
            </button>
            {opgeslagen === "ok" ? <span className="v-g__ok">Saved.</span> : null}
            {opgeslagen === "fout" ? <span className="v-g__fout">Check both addresses (they start with https://).</span> : null}
          </div>
        </div>
      </section>

      <section className="v-g__kaart">
        <div className="v-g__knoppen" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <h2>Preview</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Your website with the chat on it. Click the chat bubble to try it.</p>
          </div>
          <div className="v-g__tabs" style={{ margin: 0 }}>
            <button aria-pressed={!mobiel} onClick={() => setMobiel(false)} type="button">
              Computer
            </button>
            <button aria-pressed={mobiel} onClick={() => setMobiel(true)} type="button">
              Phone
            </button>
            <button onClick={() => openTab("ava")} type="button">
              Change the chat
            </button>
          </div>
        </div>
        <div className={`v-g__scherm${mobiel ? " is-mobiel" : ""}`}>
          <div className="v-g__scherm-balk">
            <i />
            <i />
            <i />
            <span>{d.siteUrl || "your website"}</span>
            {d.siteUrl ? (
              <a href={d.siteUrl} rel="noreferrer" target="_blank">
                Open ↗
              </a>
            ) : null}
          </div>
          <iframe key={`${versie}-${mobiel}`} loading="lazy" src={`/api/voorbeeld/${d.sleutel}`} title="Your website with Volgo" />
        </div>
        <p className="v-g__leeg" style={{ marginTop: 8 }}>
          Some parts of a website (like animations or a cookie banner) can look slightly different in this preview. Your real website is not changed.
        </p>
      </section>

      <section className="v-g__kaart">
        <h2>Install it yourself</h2>
        <p>One line of code puts the chat on your whole website. Copy it, then follow the steps for your website builder.</p>
        <pre className="v-g__code">{code}</pre>
        <div className="v-g__knoppen" style={{ margin: "10px 0 16px" }}>
          <button className="v-g__knop" onClick={() => kopieer(code, "code")} type="button">
            {gekopieerd === "code" ? "Copied ✓" : "Copy code"}
          </button>
          <button className="v-g__knop2" disabled={check === "bezig"} onClick={() => void controleer()} type="button">
            {check === "bezig" ? "Checking…" : "Check if it's installed"}
          </button>
          {check === "ok" ? <span className="v-g__ok">✓ Volgo is on your website.</span> : null}
          {check === "niet" ? <span className="v-g__fout">Not found yet. Saved and published? It can take a few minutes.</span> : null}
          {check === "geen" ? <span className="v-g__fout">Save your website address first.</span> : null}
          {check === "onbereikbaar" ? <span className="v-g__fout">Your website couldn't be reached. Check the address.</span> : null}
        </div>
        <div className="v-g__tabs">
          {PLATFORMS.map((x) => (
            <button aria-pressed={platform === x.id} key={x.id} onClick={() => setPlatform(x.id)} type="button">
              {x.naam}
            </button>
          ))}
        </div>
        <ol className="v-g__stappen">
          {p.stappen.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="v-g__leeg" style={{ marginTop: 12 }}>
          Tip: give any button on your website the attribute <code>data-ava-book</code> and it opens your calendar, for example a “Plan an appointment” button.
        </p>
      </section>

      <section className="v-g__kaart">
        <h2>Contact form and email in your Inbox</h2>
        <p>Messages from your contact form and your email land in the same Inbox as the chat. Volgo follows them up too.</p>
        <div className="v-g__form">
          <div className="v-g__veld is-breed">
            Contact form: send your form to this address (or use this form)
            <pre className="v-g__code">{formulier}</pre>
            <div className="v-g__knoppen">
              <button className="v-g__knop2" onClick={() => kopieer(formulier, "form")} type="button">
                {gekopieerd === "form" ? "Copied ✓" : "Copy form"}
              </button>
            </div>
          </div>
          {d.mailIn ? (
          <div className="v-g__veld is-breed">
            Email: forward your business email to
            <pre className="v-g__code">{`inbox-${d.sleutel}@thevolgo.app`}</pre>
            <small>In Gmail or Outlook, set up automatic forwarding of your inbox (or only of website messages) to this address.</small>
          </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
