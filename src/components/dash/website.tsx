import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { bewerkSiteMetAva, haalMijnSite, zetGepubliceerd, zetTerug } from "@/lib/api/site.functions";

import { Upsell } from "./upsell";

type Data = Awaited<ReturnType<typeof haalMijnSite>>;
type Bericht = { rol: "ik" | "ava"; tekst: string };

const IDEEEN = [
  "Write my whole website from my business info",
  "Make the headline stronger and shorter",
  "Add a service: emergency repairs, 24/7",
  "Change the main color to dark green",
  "Translate the whole site to Dutch",
  "Add our opening hours: Mon–Fri 8:00–17:00",
];

export function WebsiteBuilder({ magBewerken }: { magBewerken: boolean }) {
  const [d, setD] = useState<Data | null>(null);
  const [fout, setFout] = useState("");
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [versie, setVersie] = useState(0);
  const [mobiel, setMobiel] = useState(false);
  const lijst = useRef<HTMLDivElement>(null);

  useEffect(() => {
    haalMijnSite()
      .then(setD)
      .catch(() => setFout("Your website couldn't be loaded. Please refresh."));
  }, []);
  useEffect(() => {
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight, behavior: "smooth" });
  }, [berichten, bezig]);

  if (fout) return <p className="v-err">{fout}</p>;
  if (!d) return <p className="v-muted">Loading your website…</p>;

  const url = `/s/${d.slug}`;
  const preview = `${url}?preview=1&v=${versie}`;

  async function stuur(opdracht: string) {
    const o = opdracht.trim();
    if (!o || bezig) return;
    setBerichten((b) => [...b, { rol: "ik", tekst: o }]);
    setTekst("");
    setBezig(true);
    const r = await bewerkSiteMetAva({ data: { opdracht: o } }).catch(() => ({ ok: false as const, antwoord: "Something went wrong. Please try again." }));
    setBerichten((b) => [...b, { rol: "ava", tekst: r.antwoord }]);
    if (r.ok) {
      setD((x) => (x ? { ...x, kanTerug: true } : x));
      setVersie((v) => v + 1);
    }
    setBezig(false);
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void stuur(tekst);
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void stuur(tekst);
    }
  }
  async function terug() {
    const r = await zetTerug();
    if (r.ok) {
      setBerichten((b) => [...b, { rol: "ava", tekst: "Undone. Your previous version is back." }]);
      setD((x) => (x ? { ...x, kanTerug: true } : x));
      setVersie((v) => v + 1);
    }
  }
  async function publiceer(aan: boolean) {
    await zetGepubliceerd({ data: { aan } });
    setD((x) => (x ? { ...x, gepubliceerd: aan } : x));
  }

  return (
    <div className="v-builder">
      <aside className="v-builder__zij">
        <header className="v-builder__kop">
          <div>
            <h1>Website</h1>
            <p className="v-muted">
              {d.gepubliceerd ? (
                <>
                  <span className="v-dot v-dot--aan" /> Live at{" "}
                  <a href={url} rel="noopener" target="_blank">
                    thevolgo.app{url}
                  </a>
                </>
              ) : (
                <>
                  <span className="v-dot" /> Not published yet
                </>
              )}
            </p>
          </div>
        </header>

        {magBewerken ? (
          <>
            <div className="v-builder__chat" ref={lijst}>
              {berichten.length === 0 ? (
                <div className="v-builder__leeg">
                  <p>
                    <strong>Tell AVA what to change.</strong> Plain words are enough. AVA rewrites your site and the preview updates right away.
                  </p>
                  <div className="v-builder__ideeen">
                    {IDEEEN.map((i) => (
                      <button disabled={bezig} key={i} onClick={() => void stuur(i)} type="button">
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                berichten.map((b, i) => (
                  <p className={`v-builder__msg v-builder__msg--${b.rol}`} key={i}>
                    {b.tekst}
                  </p>
                ))
              )}
              {bezig ? <p className="v-builder__msg v-builder__msg--ava v-builder__msg--bezig">AVA is updating your website…</p> : null}
            </div>
            <form className="v-builder__balk" onSubmit={onSubmit}>
              <textarea
                aria-label="What should AVA change?"
                onChange={(e) => setTekst(e.target.value)}
                onKeyDown={onKey}
                placeholder="E.g. Add a section about our 10-year warranty"
                rows={2}
                value={tekst}
              />
              <button disabled={bezig || !tekst.trim()} type="submit">
                Update
              </button>
            </form>
            <div className="v-builder__acties">
              <button className="v-dash__logout" disabled={!d.kanTerug || bezig} onClick={() => void terug()} type="button">
                Undo last change
              </button>
              <button className={d.gepubliceerd ? "v-dash__logout" : "v-btn-blauw"} onClick={() => void publiceer(!d.gepubliceerd)} type="button">
                {d.gepubliceerd ? "Unpublish" : "Publish website"}
              </button>
            </div>
          </>
        ) : (
          <Upsell
            knop="Upgrade to Premium"
            punten={["Change any text, service or color by asking AVA", "Publish instantly, undo anytime", "Unlimited users for your whole team"]}
            tag="Premium"
            tekst="On your plan, the Volgo team builds and updates your website for you. Want to make changes yourself, any time? The website builder is part of Premium."
            titel="Edit your website with AVA"
          />
        )}
      </aside>

      <section aria-label="Website preview" className="v-builder__voorbeeld">
        <div className="v-builder__balkje">
          <span className="v-builder__adres">thevolgo.app{url}</span>
          <div className="v-seg" role="tablist">
            <button aria-selected={!mobiel} onClick={() => setMobiel(false)} role="tab" type="button">
              Desktop
            </button>
            <button aria-selected={mobiel} onClick={() => setMobiel(true)} role="tab" type="button">
              Mobile
            </button>
          </div>
          <a className="v-builder__open" href={preview} rel="noopener" target="_blank">
            Open ↗
          </a>
        </div>
        <div className={`v-builder__frame${mobiel ? " v-builder__frame--mobiel" : ""}`}>
          <iframe key={versie} src={preview} title="Your website" />
        </div>
      </section>
    </div>
  );
}
