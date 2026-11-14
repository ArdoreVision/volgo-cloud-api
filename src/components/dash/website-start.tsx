import { useEffect, useState } from "react";

import { VolgoMark } from "@/components/volgo/logo";
import { bewaarIntake, bouwEersteWebsite, haalIntakeGegevens } from "@/lib/api/website.functions";
import { THEMAS } from "@/lib/intake";

type Gegevens = {
  bedrijf: string;
  watDoetHet: string;
  diensten: string;
  gebied: string;
  telefoon: string;
  email: string;
  adres: string;
  openingstijden: string;
  stijl: "licht" | "donker";
  thema: "strak" | "warm" | "stoer" | "luxe" | "fris";
  drieD: boolean;
  kleur: string;
  extra: string;
};
const LEEG: Gegevens = { bedrijf: "", watDoetHet: "", diensten: "", gebied: "", telefoon: "", email: "", adres: "", openingstijden: "", stijl: "licht", thema: "strak", drieD: true, kleur: "", extra: "" };

const BOUWT = ["Reading what you told us…", "Writing your texts…", "Designing your pages…", "Putting the appointment setter in…", "Checking it on a phone…"];

/**
 * Before the dashboard opens: the owner tells Volgo about the business and gives their own domain name. Then Volgo
 * builds the complete website. Three screens: your business, your domain, building.
 */
export function WebsiteStart({ klaar }: { klaar: () => void | Promise<void> }) {
  const [stap, setStap] = useState<0 | 1 | 2>(0);
  const [g, setG] = useState<Gegevens>(LEEG);
  const [domein, setDomein] = useState("");
  const [geenDomein, setGeenDomein] = useState(false);
  const [drieD, setDrieD] = useState(false);
  const [doel, setDoel] = useState("sites.thevolgo.app");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const [bouwFout, setBouwFout] = useState("");
  const [tik, setTik] = useState(0);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    void haalIntakeGegevens()
      .then((d) => {
        setG({ ...LEEG, ...(d.gegevens ?? {}), bedrijf: d.gegevens?.bedrijf || d.bedrijf });
        setDomein(d.domein);
        setDrieD(d.drieD);
        setDoel(d.domeinDoel);
      })
      .catch(() => undefined)
      .finally(() => setGeladen(true));
  }, []);
  // While Volgo builds: a new line every few seconds, so the wait reads as work.
  useEffect(() => {
    if (stap !== 2 || bouwFout) return;
    const t = window.setInterval(() => setTik((n) => n + 1), 6000);
    return () => window.clearInterval(t);
  }, [stap, bouwFout]);

  const zet = <K extends keyof Gegevens>(k: K, v: Gegevens[K]) => setG((x) => ({ ...x, [k]: v }));

  function naarDomein() {
    if (g.bedrijf.trim().length < 2) return setFout("Fill in the name of your business.");
    if (g.watDoetHet.trim().length < 40) return setFout("Tell a bit more about what your business does: at least two sentences. Volgo writes your website from it.");
    if (g.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email.trim())) return setFout("That email address does not look right.");
    setFout("");
    setStap(1);
  }

  async function bouw() {
    setBouwFout("");
    const r = await bouwEersteWebsite().catch(() => ({ ok: false as const, message: "Building did not work just now." }));
    if (r.ok) return void klaar();
    setBouwFout(r.message);
  }

  async function opslaanEnBouwen() {
    if (!geenDomein && !domein.trim()) return setFout("Fill in your domain name, or tick that you do not have one yet.");
    setFout("");
    setBezig(true);
    const r = await bewaarIntake({ data: { gegevens: { ...g, kleur: /^#[0-9a-fA-F]{6}$/.test(g.kleur) ? g.kleur : "" }, domein: geenDomein ? "" : domein } }).catch(() => ({
      ok: false as const,
      message: "Saving did not work. Check what you filled in and try again.",
    }));
    setBezig(false);
    if (!r.ok) return setFout(r.message);
    if (r.domein) setDomein(r.domein);
    setStap(2);
    await bouw();
  }

  if (!geladen) return <div className="v-vragen" />;
  const schoonDomein = domein.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");

  return (
    <div className="v-vragen" role="dialog" aria-labelledby="ws-titel" aria-modal="true">
      <div className="v-vragen__kaart v-ws">
        <header className="v-vragen__top">
          <span className="v-nav__brand">
            <VolgoMark />
            Volgo
          </span>
          <span className="v-vragen__teller">{stap + 1} / 3</span>
        </header>
        <div aria-hidden="true" className="v-vragen__balk">
          <i style={{ width: `${((stap + 1) / 3) * 100}%` }} />
        </div>

        {stap === 0 ? (
          <>
            <h1 className="v-vragen__titel" id="ws-titel">
              Tell Volgo about your business
            </h1>
            <p className="v-vragen__sub">Volgo builds your {drieD ? "3D website" : "website"} from what you fill in here. Only the first two are required; the more you tell, the better your website.</p>
            <div className="v-ws__velden">
              <label className="v-g__veld">
                Name of your business
                <input autoComplete="organization" maxLength={80} onChange={(e) => zet("bedrijf", e.target.value)} value={g.bedrijf} />
              </label>
              <label className="v-g__veld">
                What does your business do, and for whom?
                <textarea maxLength={1500} onChange={(e) => zet("watDoetHet", e.target.value)} placeholder="We are a car detailing studio in Rotterdam. We clean and protect cars for private owners and lease drivers…" rows={4} value={g.watDoetHet} />
                <small>{g.watDoetHet.trim().length < 40 ? "At least two sentences." : "Good. Add anything that makes you different."}</small>
              </label>
              <label className="v-g__veld">
                Your services <small>One per line. Add a price if you want it on the website.</small>
                <textarea maxLength={1500} onChange={(e) => zet("diensten", e.target.value)} placeholder={"Interior cleaning\nExterior wash and wax\nCeramic coating"} rows={4} value={g.diensten} />
              </label>
              <div className="v-ws__twee">
                <label className="v-g__veld">
                  Where do you work?
                  <input maxLength={200} onChange={(e) => zet("gebied", e.target.value)} placeholder="Rotterdam and surroundings" value={g.gebied} />
                </label>
                <label className="v-g__veld">
                  Opening hours
                  <input maxLength={300} onChange={(e) => zet("openingstijden", e.target.value)} placeholder="Mon to Fri 8:00–17:00" value={g.openingstijden} />
                </label>
              </div>
              <div className="v-ws__twee">
                <label className="v-g__veld">
                  Phone number for customers
                  <input autoComplete="tel" inputMode="tel" maxLength={40} onChange={(e) => zet("telefoon", e.target.value)} value={g.telefoon} />
                </label>
                <label className="v-g__veld">
                  Email for customers
                  <input autoComplete="email" inputMode="email" maxLength={120} onChange={(e) => zet("email", e.target.value)} value={g.email} />
                </label>
              </div>
              <label className="v-g__veld">
                Address <small>Leave empty if customers do not come to you.</small>
                <input autoComplete="street-address" maxLength={200} onChange={(e) => zet("adres", e.target.value)} value={g.adres} />
              </label>
              <div className="v-g__veld">
                Choose your theme
                <div aria-label="Theme" className="v-ws__themas" role="radiogroup">
                  {THEMAS.map((t) => (
                    <button
                      aria-checked={g.thema === t.id}
                      key={t.id}
                      onClick={() => setG((x) => ({ ...x, thema: t.id, stijl: t.stijl }))}
                      role="radio"
                      type="button"
                    >
                      <span aria-hidden="true" className="v-ws__staal" style={{ background: t.kleuren[0], color: t.kleuren[1] }}>
                        <i style={{ background: t.kleuren[1] }} />
                        <i style={{ background: t.kleuren[1], opacity: 0.35 }} />
                        <b style={{ background: t.kleuren[2] }} />
                      </span>
                      <strong>{t.naam}</strong>
                      <small>{t.uitleg}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="v-ws__twee">
                {drieD ? (
                  <div className="v-g__veld">
                    Kind of website
                    <div className="v-ws__keuze" role="radiogroup" aria-label="Kind of website">
                      <button aria-checked={g.drieD} onClick={() => zet("drieD", true)} role="radio" type="button">
                        3D website
                      </button>
                      <button aria-checked={!g.drieD} onClick={() => zet("drieD", false)} role="radio" type="button">
                        Professional
                      </button>
                    </div>
                    <small>{g.drieD ? "3D visuals and scroll animation. Included in your plan." : "A calm, fast website without 3D."}</small>
                  </div>
                ) : (
                  <div className="v-g__veld">
                    Kind of website
                    <span className="v-ws__vast">Professional website</span>
                    <small>A 3D website comes with Pro and Complete.</small>
                  </div>
                )}
                <label className="v-g__veld">
                  Your colour <small>Optional.</small>
                  <span className="v-ws__kleur">
                    <input aria-label="Pick your colour" onChange={(e) => zet("kleur", e.target.value)} type="color" value={/^#[0-9a-fA-F]{6}$/.test(g.kleur) ? g.kleur : "#0a0a0a"} />
                    <span>{g.kleur || "Volgo chooses"}</span>
                  </span>
                </label>
              </div>
              <label className="v-g__veld">
                Anything else? <small>Your slogan, links to your social media, links to your own photos.</small>
                <textarea maxLength={1500} onChange={(e) => zet("extra", e.target.value)} rows={3} value={g.extra} />
              </label>
            </div>
            {fout ? <p className="v-vragen__fout">{fout}</p> : null}
            <footer className="v-vragen__voet">
              <span className="v-vragen__hint">Nothing goes online before you say so.</span>
              <button className="v-g__knop" onClick={naarDomein} type="button">
                Next: your domain →
              </button>
            </footer>
          </>
        ) : null}

        {stap === 1 ? (
          <>
            <h1 className="v-vragen__titel" id="ws-titel">
              Your own domain name
            </h1>
            <p className="v-vragen__sub">The address of your website, like yourbusiness.com. Fill in the domain you own; your new website comes on it.</p>
            <label className="v-g__veld">
              Domain name
              <input autoCapitalize="none" autoCorrect="off" disabled={geenDomein} inputMode="url" maxLength={260} onChange={(e) => setDomein(e.target.value)} placeholder="yourbusiness.com" value={geenDomein ? "" : domein} />
            </label>
            <label className="v-ws__vink">
              <input checked={geenDomein} onChange={(e) => setGeenDomein(e.target.checked)} type="checkbox" />
              <span>I do not have a domain yet. Build my website now; I add my domain later under Website.</span>
            </label>
            {!geenDomein && schoonDomein.includes(".") ? (
              <div className="v-ws__dns">
                <strong>How your domain gets connected</strong>
                <p>After this step, give these two lines to whoever manages your domain (or look them up at the company where you bought it). You can find them again in your dashboard under Website.</p>
                <dl>
                  <div>
                    <dt>Type</dt>
                    <dd>CNAME</dd>
                  </div>
                  <div>
                    <dt>Name</dt>
                    <dd>www</dd>
                  </div>
                  <div>
                    <dt>Points to</dt>
                    <dd>{doel}</dd>
                  </div>
                </dl>
                <p>And forward {schoonDomein} to www.{schoonDomein}. Until that is done, your website is online on a Volgo address.</p>
              </div>
            ) : null}
            {fout ? <p className="v-vragen__fout">{fout}</p> : null}
            <footer className="v-vragen__voet">
              <button className="v-vragen__terug" disabled={bezig} onClick={() => setStap(0)} type="button">
                ← Back
              </button>
              <button className="v-g__knop" disabled={bezig} onClick={() => void opslaanEnBouwen()} type="button">
                {bezig ? "Saving…" : "Build my website →"}
              </button>
            </footer>
          </>
        ) : null}

        {stap === 2 ? (
          <div className="v-ws__bouw" aria-live="polite">
            {bouwFout ? (
              <>
                <h1 className="v-vragen__titel" id="ws-titel">
                  Your details are saved. The building did not finish.
                </h1>
                <p className="v-vragen__sub">{bouwFout}</p>
                <div className="v-g__knoppen">
                  <button className="v-g__knop" onClick={() => void bouw()} type="button">
                    Try again
                  </button>
                  <button className="v-g__knop2" onClick={() => void klaar()} type="button">
                    Open my dashboard
                  </button>
                </div>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="v-ws__draai" />
                <h1 className="v-vragen__titel" id="ws-titel">
                  Volgo is building your {drieD ? "3D website" : "website"}
                </h1>
                <p className="v-vragen__sub">This takes one to two minutes. Keep this page open; your dashboard opens by itself when it is ready.</p>
                <p className="v-ws__regel">{BOUWT[Math.min(tik, BOUWT.length - 1)]}</p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
