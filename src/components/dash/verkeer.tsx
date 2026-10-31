import { useEffect, useState } from "react";

import { haalVerkeer } from "@/lib/api/verkeer.functions";

type Data = Awaited<ReturnType<typeof haalVerkeer>>;

const BEREIK: [number, string][] = [
  [1, "Today"],
  [7, "7 days"],
  [30, "30 days"],
  [60, "60 days"],
  [90, "90 days"],
];

const getal = (n: number) => n.toLocaleString("en-GB");
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
    return code === "??" ? "Unknown" : (new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code);
  } catch {
    return code;
  }
};

function Verschil({ nu, toen }: { nu: number; toen: number }) {
  if (!toen) return <small className="v-vk__delta">no earlier data</small>;
  const p = Math.round(((nu - toen) / toen) * 100);
  return <small className={`v-vk__delta ${p > 0 ? "is-op" : p < 0 ? "is-neer" : ""}`}>{p > 0 ? `+${p}%` : `${p}%`} vs previous period</small>;
}

function Lijst({ titel, rijen, sleutel }: { titel: string; rijen: { naam: string; n: number; extra?: string }[]; sleutel?: (n: string) => string }) {
  const max = Math.max(1, ...rijen.map((r) => r.n));
  return (
    <section className="v-dash__panel v-vk__lijst">
      <h2 className="v-sub">{titel}</h2>
      {rijen.length === 0 ? <p className="v-muted v-small">No data yet.</p> : null}
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

/** Website traffic measured by AVA, in plain language. */
export function Verkeer({ openTab }: { openTab: (t: string) => void }) {
  const [dagen, setDagen] = useState(30);
  const [d, setD] = useState<Data | null>(null);
  const [fout, setFout] = useState("");

  useEffect(() => {
    let weg = false;
    const laad = () =>
      haalVerkeer({ data: { dagen } })
        .then((r) => !weg && setD(r))
        .catch((e) => !weg && setFout(e instanceof Error ? e.message : "Couldn't load your traffic."));
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
        ["Visitors", d.bezoekers],
        ["Opened the chat", d.chatOpen],
        ["Asked AVA something", d.chatBericht],
        ["Became a lead", d.leads],
        ["Booked an appointment", d.geboekt],
      ]
    : [];

  return (
    <>
      <header className="v-dash__head v-vk__kop">
        <div>
          <h1>Traffic</h1>
          <p>
            Who visits your website, where they come from and how many become leads. Measured by AVA, with your visitors’ permission.
            {d && d.live > 0 ? (
              <span className="v-vk__live">
                <i /> {d.live} on your site now
              </span>
            ) : null}
          </p>
        </div>
        <div className="v-seg" role="tablist" aria-label="Period">
          {BEREIK.map(([n, l]) => (
            <button aria-selected={dagen === n} disabled={d ? n > d.max : false} key={n} onClick={() => setDagen(n)} role="tab" type="button">
              {l}
            </button>
          ))}
        </div>
      </header>
      {fout ? <p className="v-err">{fout}</p> : null}
      {!d ? <p className="v-feed__empty">Loading your traffic…</p> : null}
      {d && d.views === 0 ? (
        <section className="v-dash__panel v-vk__leeg">
          <h2 className="v-sub">No visits measured yet</h2>
          <p className="v-muted">As soon as AVA is on your website, every visit shows up here: pages, sources, devices, countries and how many visitors become leads.</p>
          <button className="v-btn-dark" onClick={() => openTab("installeren")} type="button">
            Install AVA on your website
          </button>
        </section>
      ) : null}
      {d && d.views > 0 ? (
        <>
          <section className="v-vk__tegels">
            <div>
              <span>Visitors</span>
              <strong>{getal(d.bezoekers)}</strong>
              <Verschil nu={d.bezoekers} toen={d.vorigeBezoekers} />
            </div>
            <div>
              <span>Page views</span>
              <strong>{getal(d.views)}</strong>
              <Verschil nu={d.views} toen={d.vorigeViews} />
            </div>
            <div>
              <span>Time per visit</span>
              <strong>{tijd(d.tijdPerBezoek)}</strong>
              <small className="v-vk__delta">scroll depth {d.scroll}%</small>
            </div>
            <div>
              <span>Left right away</span>
              <strong>{d.stuiter}%</strong>
              <small className="v-vk__delta">1 page, under 10 seconds</small>
            </div>
            <div className="is-blauw">
              <span>Visitors who became a lead</span>
              <strong>{d.bezoekers ? `${((d.leads / d.bezoekers) * 100).toFixed(1)}%` : "0%"}</strong>
              <small className="v-vk__delta">
                {getal(d.leads)} {d.leads === 1 ? "lead" : "leads"} from your website
              </small>
            </div>
          </section>

          <section className="v-dash__panel">
            <h2 className="v-sub">Visitors per day</h2>
            <div aria-label="Visitors per day" className="v-vk__grafiek" role="img">
              {d.perDag.map((x) => (
                <div key={x.dag} title={`${x.dag}: ${x.bezoekers} visitors, ${x.views} page views`}>
                  <i style={{ height: `${Math.max(3, (x.bezoekers / maxDag) * 100)}%` }} />
                  <small>{d.perDag.length <= 14 ? x.dag.slice(8, 10) + "/" + x.dag.slice(5, 7) : ""}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="v-dash__panel v-vk__trechter">
            <h2 className="v-sub">From visitor to customer</h2>
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

          {d.nuOp.length ? (
            <section className="v-dash__panel v-vk__nu">
              <h2 className="v-sub">
                <i /> On your website right now
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
              titel="Cities and regions"
            />
            <Lijst rijen={d.paginas.map((p) => ({ naam: p.pad, n: p.views, extra: `${tijd(p.duur)} · ${p.scroll}%` }))} titel="Top pages" />
            <Lijst rijen={d.bronnen} titel="Where visitors come from" />
            <Lijst rijen={d.apparaten} titel="Devices" />
            <Lijst rijen={d.landen} sleutel={(c) => `${vlag(c)}  ${landNaam(c)}`} titel="Countries" />
            <Lijst rijen={d.browsers} titel="Browsers" />
            <Lijst rijen={d.systemen} titel="Operating systems" />
            <Lijst rijen={d.talen} sleutel={(c) => taalNaam(c)} titel="Languages" />
            <section className="v-dash__panel v-vk__lijst">
              <h2 className="v-sub">Visitors who said yes</h2>
              <p className="v-vk__groot">{d.toestemmingPct}%</p>
              <p className="v-muted v-small">
                gave permission for location and device details. {d.terugkerend} returning {d.terugkerend === 1 ? "visitor" : "visitors"} in this period.
              </p>
            </section>
          </div>
          <p className="v-muted v-small v-vk__noot">
            Visitors first choose in a consent screen. City, region, browser, system, language and returning visits are only stored for visitors who
            accept; the others are only counted anonymously. No IP addresses are stored, browsers that ask not to be tracked are skipped, and data is kept
            for 13 months.
          </p>
        </>
      ) : null}
    </>
  );
}
