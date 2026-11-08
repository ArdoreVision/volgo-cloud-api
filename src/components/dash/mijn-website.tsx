import { useEffect, useState } from "react";

import { bewaarMijnWebsite, controleerInstallatie, haalMijnWebsite } from "@/lib/api/groei.functions";

type Data = Awaited<ReturnType<typeof haalMijnWebsite>>;

const PLATFORMS: { id: string; naam: string; stappen: string[] }[] = [
  {
    id: "wordpress",
    naam: "WordPress",
    stappen: [
      "Installeer de gratis plugin “WPCode” (Plugins → Nieuwe plugin).",
      "Ga naar Code Snippets → Header & Footer.",
      "Plak de code in het vak Footer en klik op Save.",
    ],
  },
  { id: "wix", naam: "Wix", stappen: ["Open Instellingen → Aangepaste code (onder Geavanceerd).", "Klik op + Aangepaste code toevoegen en plak de code.", "Kies Alle pagina's, plaats het in Body - einde en klik op Toepassen."] },
  { id: "squarespace", naam: "Squarespace", stappen: ["Open Settings → Advanced → Code injection.", "Plak de code in het vak Footer.", "Klik op Opslaan."] },
  { id: "shopify", naam: "Shopify", stappen: ["Open Online Store → Thema's → … → Code bewerken.", "Open theme.liquid en plak de code net boven </body>.", "Klik op Opslaan."] },
  { id: "webflow", naam: "Webflow", stappen: ["Open Site settings → Custom code.", "Plak de code bij Footer code.", "Opslaan en je site publiceren."] },
  { id: "anders", naam: "Anders / HTML", stappen: ["Plak de code net boven </body> op elke pagina (of in de footer-template van je site).", "Opslaan en publiceren.", "Kun je het niet vinden? Stuur deze pagina naar wie je website maakte, dat kost hen twee minuten."] },
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
  if (!d) return <p className="v-g__leeg">Laden…</p>;

  const origin = typeof window === "undefined" ? "https://thevolgo.app" : window.location.origin;
  const code = `<script src="${origin}/ava.js" data-key="${d.sleutel}" defer></script>`;
  const formulier = `<form action="${origin}/api/formulier/${d.sleutel}" method="post">
  <input name="naam" placeholder="Name" required>
  <input name="email" type="email" placeholder="Email" required>
  <input name="telefoon" placeholder="Telefoon">
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
        <h1>Je website</h1>
        <p>Zie je eigen website met je Volgo-chat erop, precies zoals bezoekers hem zien. Installeer het zelf in twee minuten, zonder technische kennis.</p>
      </header>

      <section className="v-g__kaart">
        <h2>Je gegevens</h2>
        <div className="v-g__form">
          <label className="v-g__veld">
            Websiteadres
            <input inputMode="url" onChange={(e) => setSite(e.target.value)} placeholder="https://www.yourbusiness.com" value={site} />
          </label>
          <label className="v-g__veld">
            Google-reviewlink
            <input inputMode="url" onChange={(e) => setReview(e.target.value)} placeholder="https://g.page/r/…/review" value={review} />
            <small>
              Je vindt hem in je Google-bedrijfsprofiel → <em>Reviews vragen</em> → kopieer de link.
            </small>
          </label>
          <div className="v-g__knoppen is-breed">
            <button className="v-g__knop" onClick={() => void bewaar()} type="button">
              Opslaan
            </button>
            {opgeslagen === "ok" ? <span className="v-g__ok">Opgeslagen.</span> : null}
            {opgeslagen === "fout" ? <span className="v-g__fout">Controleer beide adressen (ze beginnen met https://).</span> : null}
          </div>
        </div>
      </section>

      <section className="v-g__kaart">
        <div className="v-g__knoppen" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <h2>Voorbeeld</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Je website met de chat erop. Klik op de chatknop om hem te proberen.</p>
          </div>
          <div className="v-g__tabs" style={{ margin: 0 }}>
            <button aria-pressed={!mobiel} onClick={() => setMobiel(false)} type="button">
              Computer
            </button>
            <button aria-pressed={mobiel} onClick={() => setMobiel(true)} type="button">
              Telefoon
            </button>
            <button onClick={() => openTab("ava")} type="button">
              Chat aanpassen
            </button>
          </div>
        </div>
        <div className={`v-g__scherm${mobiel ? " is-mobiel" : ""}`}>
          <div className="v-g__scherm-balk">
            <i />
            <i />
            <i />
            <span>{d.siteUrl || "je website"}</span>
            {d.siteUrl ? (
              <a href={d.siteUrl} rel="noreferrer" target="_blank">
                Openen ↗
              </a>
            ) : null}
          </div>
          <iframe key={`${versie}-${mobiel}`} loading="lazy" src={`/api/voorbeeld/${d.sleutel}`} title="Je website met Volgo" />
        </div>
        <p className="v-g__leeg" style={{ marginTop: 8 }}>
          Sommige delen van een website (zoals animaties of een cookiebanner) kunnen er in dit voorbeeld iets anders uitzien. Je echte website verandert niet.
        </p>
      </section>

      <section className="v-g__kaart">
        <h2>Zelf installeren</h2>
        <p>Eén regel code zet de chat op je hele website. Kopieer hem en volg de stappen voor jouw websitebouwer.</p>
        <pre className="v-g__code">{code}</pre>
        <div className="v-g__knoppen" style={{ margin: "10px 0 16px" }}>
          <button className="v-g__knop" onClick={() => kopieer(code, "code")} type="button">
            {gekopieerd === "code" ? "Gekopieerd ✓" : "Code kopiëren"}
          </button>
          <button className="v-g__knop2" disabled={check === "bezig"} onClick={() => void controleer()} type="button">
            {check === "bezig" ? "Controleren…" : "Check of hij goed staat"}
          </button>
          {check === "ok" ? <span className="v-g__ok">✓ Volgo staat op je website.</span> : null}
          {check === "niet" ? <span className="v-g__fout">Nog niet gevonden. Opgeslagen en gepubliceerd? Het kan een paar minuten duren.</span> : null}
          {check === "geen" ? <span className="v-g__fout">Sla eerst je websiteadres op.</span> : null}
          {check === "onbereikbaar" ? <span className="v-g__fout">Je website was niet bereikbaar. Controleer het adres.</span> : null}
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
          Tip: geef een knop op je website het attribuut <code>data-ava-book</code> en hij opent je agenda, bijvoorbeeld een knop “Plan een afspraak”.
        </p>
      </section>

      <section className="v-g__kaart">
        <h2>Contactformulier en mail in je Inbox</h2>
        <p>Berichten van je contactformulier en je mail komen in dezelfde Inbox als de chat. Volgo volgt ze ook op.</p>
        <div className="v-g__form">
          <div className="v-g__veld is-breed">
            Contactformulier: stuur je formulier naar dit adres (of gebruik dit formulier)
            <pre className="v-g__code">{formulier}</pre>
            <div className="v-g__knoppen">
              <button className="v-g__knop2" onClick={() => kopieer(formulier, "form")} type="button">
                {gekopieerd === "form" ? "Gekopieerd ✓" : "Formulier kopiëren"}
              </button>
            </div>
          </div>
          {d.mailIn ? (
          <div className="v-g__veld is-breed">
            Mail: stuur je zakelijke mail door naar
            <pre className="v-g__code">{`inbox-${d.sleutel}@thevolgo.app`}</pre>
            <small>Stel in Gmail of Outlook automatisch doorsturen in van je inbox (of alleen websiteberichten) naar dit adres.</small>
          </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
