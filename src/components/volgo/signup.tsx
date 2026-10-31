import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { verstuurAanvraag } from "@/lib/api/aanvraag.functions";

type Fouten = Partial<Record<"naam" | "bedrijf" | "email" | "telefoon" | "toestemming" | "algemeen", string>>;

const WENSEN = ["Nieuwe website met AVA", "Alleen AVA in mijn site", "Weet ik nog niet"];
const BRANCHES = ["Installatie", "Bouw en verbouw", "Tuin en buiten", "Beauty en wellness", "Zorg", "Zakelijke dienstverlening", "Horeca", "Anders"];

export function Signup() {
  const [wens, setWens] = useState(WENSEN[0]);
  const [fouten, setFouten] = useState<Fouten>({});
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState<string | null>(null);
  const start = useRef(0);

  useEffect(() => {
    start.current = Date.now();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const f: Fouten = {};
    if (v("naam").length < 2) f.naam = "Vul je naam in.";
    if (v("bedrijf").length < 2) f.bedrijf = "Vul je bedrijfsnaam in.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email"))) f.email = "Vul een geldig e-mailadres in.";
    if (v("telefoon") && !/^[+\d][\d\s\-()]{7,}$/.test(v("telefoon"))) f.telefoon = "Dit nummer lijkt niet te kloppen.";
    if (fd.get("toestemming") !== "on") f.toestemming = "Geef toestemming zodat we contact mogen opnemen.";
    setFouten(f);
    if (Object.keys(f).length) return;

    const payload = {
      naam: v("naam"),
      bedrijf: v("bedrijf"),
      email: v("email"),
      telefoon: v("telefoon"),
      website: v("website"),
      branche: v("branche"),
      wens,
      bericht: v("bericht"),
    };

    setBezig(true);
    try {
      const res = await verstuurAanvraag({
        data: { ...payload, toestemming: true, hp: v("hp"), ms: Date.now() - start.current },
      });
      if (!res.ok) {
        setFouten({ algemeen: res.message });
        return;
      }
      if (!res.mailed) {
        // Reserve: laat de browser van de bezoeker de mail versturen.
        void fetch(`https://formsubmit.co/ajax/${res.inbox}`, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: `Nieuwe demo-aanvraag: ${payload.bedrijf} (${payload.naam})`,
            _template: "table",
            _captcha: "false",
            _replyto: payload.email,
            Naam: payload.naam,
            Bedrijf: payload.bedrijf,
            "E-mail": payload.email,
            Telefoon: payload.telefoon || "-",
            "Huidige website": payload.website || "-",
            Branche: payload.branche || "-",
            Interesse: payload.wens,
            Bericht: payload.bericht || "-",
          }),
        }).catch(() => undefined);
      }
      setKlaar(payload.naam.split(/\s+/)[0] ?? "");
    } catch {
      setFouten({ algemeen: "Versturen lukte niet. Controleer je verbinding en probeer het opnieuw." });
    } finally {
      setBezig(false);
    }
  }

  const err = (k: keyof Fouten, id: string) => (fouten[k] ? <p className="v-err" id={id}>{fouten[k]}</p> : null);

  return (
    <section aria-labelledby="aanvraag-titel" className="v-signup" id="aanvragen">
      <div className="v-signup__card">
        <div className="v-signup__intro">
          <h2 className="v-h2" id="aanvraag-titel">
            Zie AVA werken voor jouw bedrijf.
          </h2>
          <p className="v-lede">
            Vraag een gratis demo aan. We laten zien hoe jouw website en AVA samen klanten binnenhalen en opvolgen,
            en je krijgt een vaste prijs. Geen verplichtingen.
          </p>
          <ul className="v-signup__promise">
            <li>Binnen 24 uur persoonlijk contact</li>
            <li>Demo met jouw eigen bedrijf als voorbeeld</li>
            <li>Gratis en vrijblijvend</li>
          </ul>
        </div>

        {klaar !== null ? (
          <div aria-live="polite" className="v-done" role="status">
            <svg aria-hidden="true" className="v-done__check" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27l7 7 15-16" />
            </svg>
            <h3>Bedankt{klaar ? `, ${klaar}` : ""}!</h3>
            <p>Je aanvraag is binnen. We nemen binnen 24 uur contact met je op om de demo in te plannen.</p>
          </div>
        ) : (
          <form className="v-form" noValidate onSubmit={onSubmit}>
            <fieldset className="v-wens">
              <legend>Waar ben je naar op zoek?</legend>
              <div className="v-wens__opts">
                {WENSEN.map((w) => (
                  <label key={w}>
                    <input checked={wens === w} name="wens" onChange={() => setWens(w)} type="radio" value={w} />
                    <span>{w}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="v-row">
              <div className="v-fld">
                <label htmlFor="naam">Naam</label>
                <input aria-describedby={fouten.naam ? "e-naam" : undefined} aria-invalid={!!fouten.naam} autoComplete="name" id="naam" maxLength={100} name="naam" />
                {err("naam", "e-naam")}
              </div>
              <div className="v-fld">
                <label htmlFor="bedrijf">Bedrijfsnaam</label>
                <input aria-describedby={fouten.bedrijf ? "e-bedrijf" : undefined} aria-invalid={!!fouten.bedrijf} autoComplete="organization" id="bedrijf" maxLength={120} name="bedrijf" />
                {err("bedrijf", "e-bedrijf")}
              </div>
            </div>
            <div className="v-row">
              <div className="v-fld">
                <label htmlFor="email">E-mailadres</label>
                <input aria-describedby={fouten.email ? "e-email" : undefined} aria-invalid={!!fouten.email} autoComplete="email" id="email" inputMode="email" maxLength={200} name="email" type="email" />
                {err("email", "e-email")}
              </div>
              <div className="v-fld">
                <label htmlFor="telefoon">
                  Telefoon <em>optioneel</em>
                </label>
                <input aria-describedby={fouten.telefoon ? "e-tel" : undefined} aria-invalid={!!fouten.telefoon} autoComplete="tel" id="telefoon" inputMode="tel" maxLength={30} name="telefoon" type="tel" />
                {err("telefoon", "e-tel")}
              </div>
            </div>
            <div className="v-row">
              <div className="v-fld">
                <label htmlFor="website">
                  Huidige website <em>optioneel</em>
                </label>
                <input autoComplete="url" id="website" inputMode="url" maxLength={200} name="website" placeholder="jouwbedrijf.nl" />
              </div>
              <div className="v-fld">
                <label htmlFor="branche">Branche</label>
                <select defaultValue="" id="branche" name="branche">
                  <option disabled value="">
                    Kies je branche
                  </option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="v-fld">
              <label htmlFor="bericht">
                Iets wat we moeten weten? <em>optioneel</em>
              </label>
              <textarea id="bericht" maxLength={2000} name="bericht" rows={3} />
            </div>
            <div aria-hidden="true" className="v-hp">
              <label>
                Laat leeg
                <input autoComplete="off" name="hp" tabIndex={-1} />
              </label>
            </div>
            <label className="v-consent">
              <input name="toestemming" type="checkbox" />
              <span aria-hidden="true" className="v-consent__box">
                <svg viewBox="0 0 16 16">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              </span>
              <span>
                Volgo mag contact met me opnemen over deze aanvraag. Lees de{" "}
                <a href="/privacy" style={{ color: "inherit" }}>
                  privacyverklaring
                </a>
                .
              </span>
            </label>
            {err("toestemming", "e-toest")}
            <button aria-busy={bezig} className="v-submit" disabled={bezig} type="submit">
              {bezig ? "Bezig met versturen" : "Verstuur aanvraag"}
            </button>
            {fouten.algemeen ? (
              <p className="v-err v-err--c" role="alert">
                {fouten.algemeen}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
