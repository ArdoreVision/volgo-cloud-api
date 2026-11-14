import { useEffect, useState } from "react";

import { bewaarMijnWebsite, controleerInstallatie, haalMijnWebsite } from "@/lib/api/groei.functions";
import { PLATFORMS, installRegel } from "@/lib/installatie";

type Data = Awaited<ReturnType<typeof haalMijnWebsite>>;

/**
 * Installeren: put Volgo in your own website in three steps (address, paste one line, check),
 * then a live preview with your chat on it and everything else you can connect.
 */
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
        // A saved address: check straight away, so the status at the top is real.
        if (x.siteUrl)
          void controleerInstallatie()
            .then((r) => setCheck(r.status === "ok" ? "ok" : ""))
            .catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);
  if (!d) return <p className="v-g__leeg">Laden…</p>;

  const origin = typeof window === "undefined" ? "https://thevolgo.app" : window.location.origin;
  const code = installRegel(origin, d.sleutel);
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
  const p = PLATFORMS.find((x) => x.id === platform) ?? PLATFORMS[0];
  const naar = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const staat = check === "ok";
  const hulp = `mailto:volgo.app@outlook.com?subject=${encodeURIComponent("Zet Volgo op mijn website")}&body=${encodeURIComponent(`Hoi Volgo,\n\nWillen jullie Volgo in mijn website zetten?\n\nWebsite: ${d.siteUrl || ""}\nMijn regel: ${code}\n`)}`;
  // For a business that has someone else manage its website: a ready-made mail with the line and where it goes.
  const bouwer = `mailto:?subject=${encodeURIComponent("Kun je deze regel in mijn website zetten?")}&body=${encodeURIComponent(`Hoi,\n\nKun je deze ene regel in mijn website zetten${d.siteUrl ? ` (${d.siteUrl})` : ""}? Hij moet net boven </body> staan, op elke pagina. Dat kost een paar minuten.\n\n${code}\n\nDit is Volgo: de chat waarmee bezoekers zelf een afspraak plannen.\n\nDank je!`)}`;
  // Everything that can be connected, in one list, with where to do it.
  const koppelingen: { naam: string; uitleg: string; status: string; aan: boolean; knop: string; doe: () => void }[] = [
    { naam: "Volgo op je website", uitleg: "Bezoekers chatten, Volgo stelt je vragen en plant de afspraak.", status: staat ? "Werkt" : "Nog niet geïnstalleerd", aan: staat, knop: "Installeren", doe: () => naar("mw-installeren") },
    { naam: "Agenda en openingstijden", uitleg: "Wanneer klanten kunnen boeken, hoe lang een afspraak duurt en welke soorten.", status: "Bij Agenda", aan: false, knop: "Openen", doe: () => openTab("agenda") },
    { naam: "Je vragen en je chat", uitleg: "De vragen die Volgo stelt vóór een afspraak, en naam, foto en kleur.", status: "Bij Je chat", aan: false, knop: "Openen", doe: () => openTab("ava") },
    { naam: "Herinnering en opvolging", uitleg: "Herinnering de dag ervoor, opvolging na 1 en 3 dagen.", status: "Bij Automatisch", aan: false, knop: "Openen", doe: () => openTab("automatisch") },
    { naam: "Contactformulier", uitleg: "Berichten van je formulier komen in dezelfde Inbox.", status: "Optioneel", aan: false, knop: "Bekijken", doe: () => naar("mw-formulier") },
    ...(d.mailIn ? [{ naam: "Je mail", uitleg: "Stuur je zakelijke mail door, dan staat die ook in je Inbox.", status: "Optioneel", aan: false, knop: "Bekijken", doe: () => naar("mw-formulier") }] : []),
    { naam: "WhatsApp en telefoon", uitleg: "Knoppen om je te appen of te bellen, en je zakelijke nummer.", status: "Bij Kanalen", aan: false, knop: "Openen", doe: () => openTab("kanalen") },
    { naam: "Google-reviews", uitleg: "Na een afspraak vraagt Volgo automatisch om een review.", status: d.reviewUrl ? "Werkt" : "Nog geen link", aan: Boolean(d.reviewUrl), knop: "Link invullen", doe: () => naar("mw-review") },
  ];

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Installeren</h1>
        <p>Volgo komt in de website die je al hebt. Drie stappen, zonder technische kennis: adres invullen, één regel plakken, checken.</p>
      </header>

      <section className="v-g__kaart" id="mw-installeren">
        <div className="v-g__knoppen" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Volgo in je website zetten</h2>
          <span className={`v-g__status${staat ? " is-aan" : " is-let"}`}>{staat ? "✓ Volgo staat op je website" : "Nog niet geïnstalleerd"}</span>
        </div>

        <div className="v-inst" id="mw-gegevens">
          <span aria-hidden="true" className={`v-inst__nr${d.siteUrl ? " is-klaar" : ""}`}>
            {d.siteUrl ? "✓" : 1}
          </span>
          <div className="v-inst__body">
            <strong>Vul je websiteadres in</strong>
            <small>Dan weet Volgo op welke website je chat komt.</small>
            <div className="v-inst__rij">
              <label className="v-g__veld" style={{ flex: "1 1 220px" }}>
                <span className="v-sr">Websiteadres</span>
                <input inputMode="url" onChange={(e) => setSite(e.target.value)} placeholder="www.jouwbedrijf.nl" value={site} />
              </label>
              <button className="v-g__knop" onClick={() => void bewaar()} type="button">
                Opslaan
              </button>
            </div>
            {opgeslagen === "ok" ? <span className="v-g__ok">Opgeslagen.</span> : null}
            {opgeslagen === "fout" ? <span className="v-g__fout">Controleer het adres. Je reviewlink (onderaan) begint met https://.</span> : null}
          </div>
        </div>

        <div className="v-inst">
          <span aria-hidden="true" className={`v-inst__nr${staat ? " is-klaar" : ""}`}>
            {staat ? "✓" : 2}
          </span>
          <div className="v-inst__body">
            <strong>Kopieer je regel en plak hem in je website</strong>
            <small>Eén regel, één keer. Daarna staat Volgo op elke pagina.</small>
            <pre className="v-g__code">{code}</pre>
            <div className="v-g__knoppen" style={{ margin: "10px 0 14px" }}>
              <button className="v-g__knop" onClick={() => kopieer(code, "code")} type="button">
                {gekopieerd === "code" ? "Gekopieerd ✓" : "Regel kopiëren"}
              </button>
              <a className="v-g__knop2" href={bouwer} style={{ textDecoration: "none" }}>
                Stuur naar mijn websitebouwer
              </a>
            </div>
            <p className="v-inst__vraag">Waar plak je hem? Kies waarmee je website gemaakt is:</p>
            <div className="v-g__tabs">
              {PLATFORMS.map((x) => (
                <button aria-pressed={platform === x.id} key={x.id} onClick={() => setPlatform(x.id)} type="button">
                  {x.naam}
                </button>
              ))}
            </div>
            <ol className="v-g__stappen">
              {p.stappen.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
            {p.noot ? (
              <p className="v-g__leeg" style={{ marginTop: 8 }}>
                {p.noot}
              </p>
            ) : null}
          </div>
        </div>

        <div className="v-inst">
          <span aria-hidden="true" className={`v-inst__nr${staat ? " is-klaar" : ""}`}>
            {staat ? "✓" : 3}
          </span>
          <div className="v-inst__body">
            <strong>Check of hij goed staat</strong>
            <small>Volgo kijkt zelf op je website of de chat er staat.</small>
            <div className="v-g__knoppen" style={{ marginTop: 10 }}>
              <button className="v-g__knop" disabled={check === "bezig"} onClick={() => void controleer()} type="button">
                {check === "bezig" ? "Controleren…" : staat ? "Opnieuw checken" : "Nu checken"}
              </button>
              {check === "ok" ? <span className="v-g__ok">✓ Volgo staat op je website. Afspraken komen nu vanzelf binnen.</span> : null}
              {check === "niet" ? <span className="v-g__fout">Nog niet gevonden. Heb je de regel opgeslagen en je website gepubliceerd? Het kan een paar minuten duren.</span> : null}
              {check === "geen" ? <span className="v-g__fout">Vul eerst je websiteadres in (stap 1) en klik op Opslaan.</span> : null}
              {check === "onbereikbaar" ? <span className="v-g__fout">Je website was niet bereikbaar. Controleer het adres bij stap 1.</span> : null}
            </div>
          </div>
        </div>

        <div className="v-g__knoppen" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <a className="v-g__knop2" href={hulp} style={{ textDecoration: "none" }}>
            Liever dat wij het doen? Mail ons
          </a>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Wij zetten het dezelfde dag voor je aan.</span>
        </div>
        <p className="v-g__leeg" style={{ marginTop: 12 }}>
          Tip: geef een knop op je website het attribuut <code>data-ava-book</code> en hij opent meteen je agenda, bijvoorbeeld een knop “Plan een afspraak”.
        </p>
      </section>

      <section className="v-g__kaart">
        <h2>Alles wat bij je setter hoort</h2>
        <p>Eén overzicht van alles wat Volgo voor je doet, en waar je het instelt.</p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
          {koppelingen.map((k) => (
            <li key={k.naam} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "11px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 15 }}>{k.naam}</strong>
                <small style={{ color: "var(--muted)" }}>{k.uitleg}</small>
              </div>
              <span className={`v-g__status${k.aan ? " is-aan" : ""}`} style={{ alignSelf: "center" }}>
                {k.status}
              </span>
              <button className="v-g__knop2" onClick={k.doe} type="button">
                {k.knop}
              </button>
            </li>
          ))}
        </ul>
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

      <section className="v-g__kaart" id="mw-review">
        <h2>Google-reviewlink</h2>
        <p>Na een afspraak vraagt Volgo automatisch om een review. Daarvoor is je reviewlink nodig.</p>
        <div className="v-g__form">
          <label className="v-g__veld is-breed">
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
            {opgeslagen === "fout" ? <span className="v-g__fout">De link moet beginnen met https://.</span> : null}
          </div>
        </div>
      </section>

      <section className="v-g__kaart" id="mw-formulier">
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
