import { useEffect, useState } from "react";

import { haalGesprek } from "@/lib/api/ava.functions";

import { type DashData, geleden, sqlDate, tijdAms, warmteLabel } from "./util";

type Detail = NonNullable<Awaited<ReturnType<typeof haalGesprek>>>;

export function Gesprekken({ data }: { data: DashData }) {
  const [actief, setActief] = useState<number | null>(data.gesprekken[0]?.id ?? null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [nu, setNu] = useState(() => Date.parse(data.nu));

  useEffect(() => {
    if (actief === null) return;
    let stop = false;
    const laad = async () => {
      const d = await haalGesprek({ data: { id: actief } }).catch(() => null);
      if (!stop) {
        setDetail(d);
        setNu(Date.now());
      }
    };
    void laad();
    const id = window.setInterval(() => void laad(), 4000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [actief]);

  const isLive = (laatste: string, status: string) => status === "live" && nu - sqlDate(laatste).getTime() < 10 * 60000;

  return (
    <>
      <header className="v-dash__head">
        <h1>Gesprekken</h1>
        <p>Alles wat AVA met bezoekers van je website bespreekt. Live gesprekken lees je mee terwijl ze gebeuren.</p>
      </header>
      <div className="v-convo">
        <aside className="v-convo__list">
          {data.gesprekken.map((g) => (
            <button aria-current={actief === g.id} className="v-convo__item" key={g.id} onClick={() => setActief(g.id)} type="button">
              <div className="v-convo__row">
                <strong>{g.bezoeker}</strong>
                {isLive(g.laatste, g.status) ? <span className="v-live-badge">Live</span> : <time>{tijdAms(sqlDate(g.laatste))}</time>}
              </div>
              <p>{g.onderwerp}</p>
              <small>
                <span className={`v-heat v-heat--mini v-heat--${warmteLabel(g.warmte).toLowerCase()}`}>{g.warmte}</span> {g.kanaal} · {g.berichten} berichten
                {g.voorbeeld ? " · voorbeeld" : ""}
              </small>
            </button>
          ))}
          {data.gesprekken.length === 0 ? <p className="v-feed__empty v-pad">Nog geen gesprekken. Zodra iemand AVA op je website aanspreekt, zie je het hier.</p> : null}
        </aside>
        <section className="v-convo__view">
          {detail ? (
            <>
              <header className="v-convo__head">
                <div>
                  <h2>{detail.gesprek.bezoeker}</h2>
                  <p className="v-muted v-small">
                    {detail.gesprek.kanaal} · gestart {tijdAms(sqlDate(detail.gesprek.gestart))} · laatste bericht {geleden(sqlDate(detail.gesprek.laatste), nu)}
                    {detail.gesprek.contact ? ` · ${detail.gesprek.contact}` : ""}
                  </p>
                </div>
                <span className={`v-heat v-heat--${warmteLabel(detail.gesprek.warmte).toLowerCase()}`} title="Warmte">
                  {detail.gesprek.warmte}
                </span>
              </header>
              <div className="v-convo__msgs" role="log" aria-live="polite">
                {detail.berichten.length === 0 ? (
                  <p className="v-feed__empty">
                    {detail.gesprek.voorbeeld ? "Dit is een voorbeeldgesprek zonder berichten. Echte gesprekken tonen hier alles wat er gezegd is." : "Nog geen berichten."}
                  </p>
                ) : null}
                {detail.berichten.map((b) => (
                  <div className={`v-tb v-tb--${b.rol === "bezoeker" ? "bezoeker" : "ava"}`} key={b.id}>
                    <p>{b.tekst}</p>
                    <time>
                      {b.rol === "bezoeker" ? detail.gesprek.bezoeker : "AVA"} · {tijdAms(sqlDate(b.created_at))}
                    </time>
                  </div>
                ))}
              </div>
              {detail.gesprek.lead_id ? <p className="v-convo__lead">Deze bezoeker staat als lead in Aanvragen.</p> : null}
            </>
          ) : (
            <p className="v-feed__empty v-pad">Kies een gesprek.</p>
          )}
        </section>
      </div>
    </>
  );
}
