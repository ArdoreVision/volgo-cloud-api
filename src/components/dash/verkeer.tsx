import { useEffect, useState } from "react";

import { haalVerkeer } from "@/lib/api/verkeer.functions";

type Data = Awaited<ReturnType<typeof haalVerkeer>>;

const BEREIK: [number, string][] = [
  [1, "Vandaag"],
  [7, "7 days"],
  [30, "30 days"],
  [60, "60 days"],
  [90, "90 days"],
];

const getal = (n: number) => n.toLocaleString("nl-NL");
const tijd = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);
const vlag = (code: string) => (/^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐");
const taalNaam = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
};
const landNaam = (code: string) => {
  try {
    return code === "??" ? "Onbekend" : (new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code);
  } catch {
    return code;
  }
};

function Verschil({ nu, toen }: { nu: number; toen: number }) {
  if (!toen) return <small className="v-vk__delta">geen eerdere gegevens</small>;
  const p = Math.round(((nu - toen) / toen) * 100);
  return <small className={`v-vk__delta ${p > 0 ? "is-op" : p < 0 ? "is-neer" : ""}`}>{p > 0 ? `+${p}%` : `${p}%`} vs previous period</small>;
}

function Lijst({ titel, rijen, sleutel }: { titel: string; rijen: { naam: string; n: number; extra?: string }[]; sleutel?: (n: string) => string }) {
  const max = Math.max(1, ...rijen.map((r) => r.n));
  return (
    <section className="v-dash__panel v-vk__lijst">
      <h2 className="v-sub">{titel}</h2>
      {rijen.length === 0 ? <p className="v-muted v-small">Nog geen gegevens.</p> : null}
      <ul>
        {rijen.map((r) => (
          <li key={r.naam}>
            <i style={{ width: `${(r.n / max) * 100}%` }} />
            <span>{sleutel ? sleutel(r.naam) : r.naam}</span>
            {r.extra ? <em>{r.extra}</em> : null}
            <b>{getal(r.n)}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Website traffic measured by Volgo, in plain language. */
export function Verkeer({ openTab }: { openTab: (t: string) => void }) {
  const [dagen, setDagen] = useState(30);
  const [d, setD] = useState<Data | null>(null);
  const [fout, setFout] = useState("");

  useEffect(() => {
    let weg = false;
    const laad = () =>
      haalVerkeer({ data: { dagen } })
        .then((r) => !weg && setD(r))
        .catch((e) => !weg && setFout(e instanceof Error ? e.message : "Je bezoekers konden niet geladen worden."));
    void laad();
    const id = window.setInterval(laad, 30000);
    return () => {
      weg = true;
      window.clearInterval(id);
    };
  }, [dagen]);

  const maxDag = d ? Math.max(1, ...d.perDag.map((x) => x.bezoekers)) : 1;
  const trechter = d
    ? [
        ["Bezoekers", d.bezoekers],
        ["Opende de chat", d.chatOpen],
        ["Vroeg Volgo iets", d.chatBericht],
        ["Werd een aanvraag", d.leads],
        ["Boekte een afspraak", d.geboekt],
      ]
    : [];

  return (
    <>
      <header className="v-dash__head v-vk__kop">
        <div>
          <h1>Bezoekers</h1>
          <p>
            Who visits your website, where they come from and how many become leads. Measured by Volgo, with your visitors’ permission.
            {d && d.live > 0 ? (
              <span className="v-vk__live">
                <i /> {d.live} on your site now
              </span>
            ) : null}
          </p>
        </div>
        <div className="v-seg" role="tablist" aria-label="Periode">
          {BEREIK.map(([n, l]) => (
            <button aria-selected={dagen === n} disabled={d ? n > d.max : false} key={n} onClick={() => setDagen(n)} role="tab" type="button">
              {l}
            </button>
          ))}
        </div>
      </header>
      {fout ? <p className="v-err">{fout}</p> : null}
      {!d ? <p className="v-feed__empty">Bezoekers laden…</p> : null}
      {d && d.views === 0 ? (
        <section className="v-dash__panel v-vk__leeg">
          <h2 className="v-sub">Nog geen bezoeken gemeten</h2>
          <p className="v-muted">Zodra Volgo op je website staat, zie je hier elk bezoek: pagina's, bronnen, apparaten, landen en hoeveel bezoekers een aanvraag worden.</p>
          <button className="v-btn-dark" onClick={() => openTab("installeren")} type="button">
            Zet Volgo op je website
          </button>
        </section>
      ) : null}
      {d && d.views > 0 ? (
        <>
          <section className="v-vk__tegels">
            <div>
              <span>Bezoekers</span>
              <strong>{getal(d.bezoekers)}</strong>
              <Verschil nu={d.bezoekers} toen={d.vorigeBezoekers} />
            </div>
            <div>
              <span>Paginaweergaven</span>
              <strong>{getal(d.views)}</strong>
              <Verschil nu={d.views} toen={d.vorigeViews} />
            </div>
            <div>
              <span>Tijd per bezoek</span>
              <strong>{tijd(d.tijdPerBezoek)}</strong>
              <small className="v-vk__delta">scroll depth {d.scroll}%</small>
            </div>
            <div>
              <span>Ging meteen weg</span>
              <strong>{d.stuiter}%</strong>
              <small className="v-vk__delta">1 pagina, korter dan 10 seconden</small>
            </div>
            <div className="is-blauw">
              <span>Bezoekers die een aanvraag werden</span>
              <strong>{d.bezoekers ? `${((d.leads / d.bezoekers) * 100).toFixed(1)}%` : "0%"}</strong>
              <small className="v-vk__delta">
                {getal(d.leads)} {d.leads === 1 ? "lead" : "leads"} from your website
              </small>
            </div>
          </section>

          <section className="v-dash__panel">
            <h2 className="v-sub">Bezoekers per dag</h2>
            <div aria-label="Bezoekers per dag" className="v-vk__grafiek" role="img">
              {d.perDag.map((x) => (
                <div key={x.dag} title={`${x.dag}: ${x.bezoekers} bezoekers, ${x.views} paginaweergaven`}>
                  <i style={{ height: `${Math.max(3, (x.bezoekers / maxDag) * 100)}%` }} />
                  <small>{d.perDag.length <= 14 ? x.dag.slice(8, 10) + "/" + x.dag.slice(5, 7) : ""}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="v-dash__panel v-vk__trechter">
            <h2 className="v-sub">Van bezoeker naar klant</h2>
            {trechter.map(([l, n], i) => (
              <div key={l as string}>
                <span>{l}</span>
                <div>
                  <i style={{ width: `${d.bezoekers ? Math.max(1.5, ((n as number) / d.bezoekers) * 100) : 0}%`, opacity: 1 - i * 0.14 }} />
                </div>
                <b>{getal(n as number)}</b>
              </div>
            ))}
          </section>

          {d.trechter ? <LandingTrechter t={d.trechter} /> : null}

          {d.nuOp.length ? (
            <section className="v-dash__panel v-vk__nu">
              <h2 className="v-sub">
                <i /> Nu op je website
              </h2>
              <ul>
                {d.nuOp.map((x) => (
                  <li key={x.sessie}>
                    <span className="v-vk__nu-plek">{x.stad ? `${vlag(x.land ?? "")} ${x.stad}` : `${vlag(x.land ?? "")} ${landNaam(x.land || "??")}`}</span>
                    <span className="v-vk__nu-pad">{x.pad}</span>
                    <small>
                      {x.apparaat} · {x.paginas} {x.paginas === 1 ? "page" : "pages"}
                      {x.bron && x.bron !== "Direct" ? ` · via ${x.bron}` : ""}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="v-vk__raster">
            <Lijst
              rijen={d.steden.map((s) => ({ naam: `${vlag(s.land ?? "")}  ${s.stad}${s.regio ? `, ${s.regio}` : ""}`, n: s.n }))}
              titel="Steden en regio's"
            />
            <Lijst rijen={d.paginas.map((p) => ({ naam: p.pad, n: p.views, extra: `${tijd(p.duur)} · ${p.scroll}%` }))} titel="Populairste pagina's" />
            <Lijst rijen={d.bronnen} titel="Waar bezoekers vandaan komen" />
            <Lijst rijen={d.apparaten} titel="Apparaten" />
            <Lijst rijen={d.landen} sleutel={(c) => `${vlag(c)}  ${landNaam(c)}`} titel="Landen" />
            <Lijst rijen={d.browsers} titel="Browsers" />
            <Lijst rijen={d.systemen} titel="Besturingssystemen" />
            <Lijst rijen={d.talen} sleutel={(c) => taalNaam(c)} titel="Talen" />
            <section className="v-dash__panel v-vk__lijst">
              <h2 className="v-sub">Bezoekers die ja zeiden</h2>
              <p className="v-vk__groot">{d.toestemmingPct}%</p>
              <p className="v-muted v-small">
                gave permission for location and device details. {d.terugkerend} returning {d.terugkerend === 1 ? "visitor" : "visitors"} in this period.
              </p>
            </section>
          </div>
          <p className="v-muted v-small v-vk__noot">
            Bezoekers kiezen eerst in een toestemmingsscherm. Stad, regio, browser, systeem, taal en terugkerende bezoeken worden alleen bewaard bij bezoekers die
            akkoord gaan; de rest wordt alleen anoniem geteld. Er worden geen IP-adressen bewaard, browsers die niet gevolgd willen worden slaan we over, en gegevens worden
            13 maanden bewaard.
          </p>
        </>
      ) : null}
    </>
  );
}

type Trechter = {
  sessies: number;
  demoKlik: number;
  demoBericht: number;
  aboKlik: number;
  meta: { bezoekers: number; demoKlik: number; demoBericht: number; aboKlik: number } | null;
};

/** Volgo's own landing page: where visitors drop off between arriving, trying the demo and looking at the plans. */
function LandingTrechter({ t }: { t: Trechter }) {
  const rijen = (b: number, k: number, m: number, a: number) =>
    [
      ["Bezoeken (sessies)", b],
      ["Klikte op “Probeer Volgo live”", k],
      ["Stuurde een eerste demobericht", m],
      ["Klikte door naar de pakketten", a],
    ] as const;
  const blok = (titel: string, r: ReturnType<typeof rijen>) => (
    <div className="v-vk__trechter-blok">
      <h3 className="v-sub">{titel}</h3>
      {r.map(([l, n], i) => (
        <div key={l}>
          <span>{l}</span>
          <div>
            <i style={{ width: `${r[0][1] ? Math.max(1.5, (n / r[0][1]) * 100) : 0}%`, opacity: 1 - i * 0.16 }} />
          </div>
          <b>{getal(n)}</b>
        </div>
      ))}
    </div>
  );
  return (
    <section className="v-dash__panel v-vk__trechter">
      <h2 className="v-sub">Landingspagina-funnel</h2>
      <p className="v-muted">Eén keer geteld per bezoek, zonder cookies en zonder chatinhoud. Betaalde abonnementen staan onder Admin en in Stripe.</p>
      {blok("Alle bezoekers", rijen(t.sessies, t.demoKlik, t.demoBericht, t.aboKlik))}
      {t.meta ? blok("Via Facebook / Instagram", rijen(t.meta.bezoekers, t.meta.demoKlik, t.meta.demoBericht, t.meta.aboKlik)) : null}
    </section>
  );
}
