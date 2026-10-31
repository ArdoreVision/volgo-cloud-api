import { useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { planVan } from "@/lib/plans";

import { type DashData, STATUS_LABEL, type Status, dagKey, geleden, plusDag, sqlDate, tijdAms, uurAms, warmteLabel } from "./util";

type Bereik = "dag" | "week" | "maand" | "60" | "90";
const BEREIKEN: [Bereik, string, number][] = [
  ["dag", "Today", 1],
  ["week", "Week", 7],
  ["maand", "Month", 30],
  ["60", "60 days", 60],
  ["90", "90 days", 90],
];

function Delta({ nu, vorig }: { nu: number; vorig: number }) {
  if (vorig === 0 && nu === 0) return <em className="v-delta">no change</em>;
  if (vorig === 0) return <em className="v-delta v-delta--up">new</em>;
  const p = Math.round(((nu - vorig) / vorig) * 100);
  return <em className={`v-delta ${p > 0 ? "v-delta--up" : p < 0 ? "v-delta--down" : ""}`}>{p > 0 ? `+${p}%` : `${p}%`}</em>;
}

export function Overview({ data, voornaam, openTab }: { data: DashData; voornaam: string; openTab: (t: "agenda" | "aanvragen") => void }) {
  const router = useRouter();
  const [bereik, setBereik] = useState<Bereik>("maand");
  const [nu, setNu] = useState(() => Date.parse(data.nu));

  // Live: elke 20 seconden verversen.
  useEffect(() => {
    const id = window.setInterval(() => {
      setNu(Date.now());
      void router.invalidate();
    }, 20000);
    setNu(Date.now());
    return () => window.clearInterval(id);
  }, [router]);

  const dagen = BEREIKEN.find((b) => b[0] === bereik)![2];
  const vandaag = dagKey(new Date(nu));

  const stats = useMemo(() => {
    const vanaf = plusDag(vandaag, -(dagen - 1));
    const vorigVanaf = plusDag(vanaf, -dagen);
    const vorigTot = plusDag(vanaf, -1);
    const binnen = (k: string, a: string, b: string) => k >= a && k <= b;
    const leadDag = data.leads.map((l) => ({ l, k: dagKey(sqlDate(l.created_at)) }));
    const huidig = leadDag.filter((x) => binnen(x.k, vanaf, vandaag)).map((x) => x.l);
    const vorig = leadDag.filter((x) => binnen(x.k, vorigVanaf, vorigTot)).map((x) => x.l);
    const afsp = (a: string, b: string) => data.afspraken.filter((x) => binnen(x.start.slice(0, 10), a, b)).length;
    const klanten = (ls: typeof huidig) => ls.filter((l) => l.status === "klant").length;
    const conv = (ls: typeof huidig) => (ls.length ? Math.round((klanten(ls) / ls.length) * 100) : 0);

    // Grafiek: per uur (vandaag), per dag (week/maand) of per week (60/90 dagen)
    let bars: { label: string; waarde: number }[] = [];
    if (bereik === "dag") {
      bars = Array.from({ length: 24 }, (_, h) => ({ label: `${h}:00`, waarde: huidig.filter((l) => uurAms(sqlDate(l.created_at)) === h).length }));
    } else if (dagen <= 30) {
      bars = Array.from({ length: dagen }, (_, i) => {
        const k = plusDag(vanaf, i);
        return { label: `${Number(k.slice(8))}/${Number(k.slice(5, 7))}`, waarde: leadDag.filter((x) => x.k === k).length };
      });
    } else {
      const weken = Math.ceil(dagen / 7);
      bars = Array.from({ length: weken }, (_, i) => {
        const a = plusDag(vandaag, -(weken - i) * 7 + 1);
        const b = plusDag(a, 6);
        return { label: `${Number(a.slice(8))}/${Number(a.slice(5, 7))}`, waarde: leadDag.filter((x) => binnen(x.k, a, b)).length };
      });
    }
    return {
      aanvragen: [huidig.length, vorig.length],
      afspraken: [afsp(vanaf, vandaag), afsp(vorigVanaf, vorigTot)],
      klanten: [klanten(huidig), klanten(vorig)],
      conversie: [conv(huidig), conv(vorig)],
      bars,
    };
  }, [data, bereik, dagen, vandaag]);

  const max = Math.max(1, ...stats.bars.map((b) => b.waarde));
  const warmste = data.leads
    .filter((l) => l.status !== "klant" && l.status !== "verloren")
    .sort((a, b) => b.warmte - a.warmte)
    .slice(0, 5);
  const live = data.gesprekken.filter((g) => g.status === "live" && nu - sqlDate(g.laatste).getTime() < 10 * 60000);
  const recent = data.gesprekken.filter((g) => !live.includes(g)).slice(0, 4);
  const vandaagAfspraken = data.afspraken.filter((a) => a.start.startsWith(vandaag));

  return (
    <>
      <header className="v-dash__head v-dash__head--row">
        <div>
          <h1>Welcome, {voornaam}.</h1>
          <p>
            {live.length ? `AVA is talking to ${live.length} ${live.length === 1 ? "person" : "people"} right now` : "AVA is ready"} · {vandaagAfspraken.length}{" "}
            {vandaagAfspraken.length === 1 ? "appointment" : "appointments"} today
          </p>
        </div>
        <div aria-label="Period" className="v-seg" role="tablist">
          {BEREIKEN.map(([id, label, d]) => {
            const op = d > planVan(data.gebruiker.plan).limieten.analyticsDagen;
            return (
              <button
                aria-selected={bereik === id}
                disabled={op}
                key={id}
                onClick={() => setBereik(id)}
                role="tab"
                title={op ? "Available on Pro and Premium" : undefined}
                type="button"
              >
                {label}
                {op ? " · Pro" : ""}
              </button>
            );
          })}
        </div>
      </header>

      {data.leads.some((l) => l.voorbeeld) ? <p className="v-dash__note">You are looking at sample data. Your real numbers appear here as soon as AVA is live on your website.</p> : null}

      <section aria-label="Numbers" className="v-dash__stats">
        <div className="v-stat">
          <span>New requests</span>
          <strong>{stats.aanvragen[0]}</strong>
          <Delta nu={stats.aanvragen[0]} vorig={stats.aanvragen[1]} />
        </div>
        <div className="v-stat">
          <span>Appointments</span>
          <strong>{stats.afspraken[0]}</strong>
          <Delta nu={stats.afspraken[0]} vorig={stats.afspraken[1]} />
        </div>
        <div className="v-stat">
          <span>Customers won</span>
          <strong>{stats.klanten[0]}</strong>
          <Delta nu={stats.klanten[0]} vorig={stats.klanten[1]} />
        </div>
        <div className="v-stat v-stat--win">
          <span>Conversion</span>
          <strong>{stats.conversie[0]}%</strong>
          <Delta nu={stats.conversie[0]} vorig={stats.conversie[1]} />
        </div>
      </section>

      <section className="v-dash__panel">
        <div className="v-dash__panel-head">
          <h2>Requests {bereik === "dag" ? "per hour" : dagen > 30 ? "per week" : "per day"}</h2>
          <span className="v-muted">compared with the previous period</span>
        </div>
        <div className="v-chart" role="img" aria-label={`Chart with ${stats.aanvragen[0]} requests in this period`}>
          {stats.bars.map((b, i) => (
            <div className="v-chart__col" key={i} title={`${b.label}: ${b.waarde}`}>
              <div className="v-chart__bar" style={{ height: `${(b.waarde / max) * 100}%` }}>
                {b.waarde > 0 && stats.bars.length <= 31 ? <span>{b.waarde}</span> : null}
              </div>
              <small>{stats.bars.length > 16 ? (i % Math.ceil(stats.bars.length / 8) === 0 ? b.label : "") : b.label}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="v-dash__grid">
        <section className="v-dash__panel">
          <div className="v-dash__panel-head">
            <h2>
              <span aria-hidden="true" className="v-live-dot" /> AVA live
            </h2>
            <span className="v-muted">updates automatically</span>
          </div>
          <ul className="v-ava">
            {live.map((g) => (
              <li className="v-ava__item v-ava__item--live" key={g.id}>
                <div className="v-ava__top">
                  <strong>{g.bezoeker}</strong>
                  <span className="v-live-badge">Live</span>
                </div>
                <p>{g.onderwerp}</p>
                <small>
                  {g.kanaal} · started {tijdAms(sqlDate(g.gestart))} · {g.berichten} messages · last message {geleden(sqlDate(g.laatste), nu)}
                </small>
                <div className="v-warmte" title={`Warmth ${g.warmte}`}>
                  <i style={{ width: `${g.warmte}%` }} />
                </div>
              </li>
            ))}
            {live.length === 0 ? <li className="v-feed__empty">No live conversations right now.</li> : null}
            {recent.map((g) => (
              <li className="v-ava__item" key={g.id}>
                <div className="v-ava__top">
                  <strong>{g.bezoeker}</strong>
                  <span className="v-muted">
                    {tijdAms(sqlDate(g.gestart))} to {tijdAms(sqlDate(g.laatste))}
                  </span>
                </div>
                <p>{g.onderwerp}</p>
                <small>
                  {g.kanaal} · {g.berichten} messages · {geleden(sqlDate(g.laatste), nu)}
                </small>
              </li>
            ))}
          </ul>
        </section>

        <section className="v-dash__panel">
          <div className="v-dash__panel-head">
            <h2>Hottest leads</h2>
            <button onClick={() => openTab("aanvragen")} type="button">
              View all
            </button>
          </div>
          <p className="v-muted v-small">AVA puts the people most ready to buy at the top.</p>
          <ol className="v-hot">
            {warmste.map((l) => (
              <li key={l.id}>
                <span className={`v-heat v-heat--${warmteLabel(l.warmte).toLowerCase()}`}>{l.warmte}</span>
                <div>
                  <strong>{l.naam}</strong>
                  <p>{l.reden || l.onderwerp}</p>
                </div>
                <span className={`v-pill v-pill--${l.status}`}>{STATUS_LABEL[l.status as Status] ?? l.status}</span>
              </li>
            ))}
          </ol>
          <button className="v-linkbtn" onClick={() => openTab("agenda")} type="button">
            Schedule appointment
          </button>
        </section>
      </div>
    </>
  );
}
