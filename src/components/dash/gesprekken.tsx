import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { haalGesprek, neemGesprekOver, stuurMensBericht } from "@/lib/api/ava.functions";

import { type DashData, geleden, sqlDate, tijdAms, warmteLabel } from "./util";

type Detail = NonNullable<Awaited<ReturnType<typeof haalGesprek>>>;

export function Gesprekken({ data }: { data: DashData }) {
  const [actief, setActief] = useState<number | null>(data.gesprekken[0]?.id ?? null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [nu, setNu] = useState(() => Date.parse(data.nu));
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const lijst = useRef<HTMLDivElement>(null);

  const laad = useCallback(async () => {
    if (actief === null) return;
    const d = await haalGesprek({ data: { id: actief } }).catch(() => null);
    setDetail(d);
    setNu(Date.now());
  }, [actief]);

  useEffect(() => {
    if (actief === null) return;
    setDetail(null);
    setFout("");
    void laad();
    // Faster refresh while you're chatting yourself.
    const id = window.setInterval(() => void laad(), 2500);
    return () => window.clearInterval(id);
  }, [actief, laad]);

  const aantal = detail?.berichten.length ?? 0;
  useEffect(() => {
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight, behavior: "smooth" });
  }, [aantal]);

  async function overnemen(aan: boolean) {
    if (!detail) return;
    setBezig(true);
    await neemGesprekOver({ data: { id: detail.gesprek.id, aan } }).catch(() => null);
    await laad();
    setBezig(false);
  }
  async function stuur(e?: FormEvent) {
    e?.preventDefault();
    const t = tekst.trim();
    if (!t || !detail || bezig) return;
    setBezig(true);
    setTekst("");
    const r = await stuurMensBericht({ data: { id: detail.gesprek.id, tekst: t } }).catch(() => ({ ok: false as const, message: "Not sent. Try again." }));
    if (!r.ok) {
      setFout(r.message);
      setTekst(t);
    } else setFout("");
    await laad();
    setBezig(false);
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void stuur();
    }
  }

  const isLive = (laatste: string, status: string) => status === "live" && nu - sqlDate(laatste).getTime() < 10 * 60000;

  return (
    <>
      <header className="v-dash__head">
        <h1>Conversations</h1>
        <p>Everything AVA discusses with visitors to your website. Follow live conversations as they happen.</p>
      </header>
      <div className="v-convo">
        <aside className="v-convo__list">
          {data.gesprekken.map((g) => (
            <button aria-current={actief === g.id} className="v-convo__item" key={g.id} onClick={() => setActief(g.id)} type="button">
              <div className="v-convo__row">
                <strong>{g.bezoeker}</strong>
                {g.overgenomen_naam ? (
                  <span className="v-mens-badge">{g.overgenomen_naam} is chatting</span>
                ) : isLive(g.laatste, g.status) ? (
                  <span className="v-live-badge">Live</span>
                ) : (
                  <time>{tijdAms(sqlDate(g.laatste))}</time>
                )}
              </div>
              <p>{g.onderwerp}</p>
              <small>
                <span className={`v-heat v-heat--mini v-heat--${warmteLabel(g.warmte).toLowerCase()}`}>{g.warmte}</span> {g.kanaal} · {g.berichten} messages
                {g.voorbeeld ? " · sample" : ""}
              </small>
            </button>
          ))}
          {data.gesprekken.length === 0 ? <p className="v-feed__empty v-pad">No conversations yet. As soon as someone talks to AVA on your website, you will see it here.</p> : null}
        </aside>
        <section className="v-convo__view">
          {detail ? (
            <>
              <header className="v-convo__head">
                <div>
                  <h2>{detail.gesprek.bezoeker}</h2>
                  <p className="v-muted v-small">
                    {detail.gesprek.kanaal} · started {tijdAms(sqlDate(detail.gesprek.gestart))} · last message {geleden(sqlDate(detail.gesprek.laatste), nu)}
                    {detail.gesprek.contact ? ` · ${detail.gesprek.contact}` : ""}
                  </p>
                </div>
                <div className="v-convo__acties">
                  <span className={`v-heat v-heat--${warmteLabel(detail.gesprek.warmte).toLowerCase()}`} title="Warmth">
                    {detail.gesprek.warmte}
                  </span>
                  {detail.gesprek.kan_chatten ? (
                    detail.gesprek.overgenomen_door ? (
                      <button className="v-dash__logout" disabled={bezig} onClick={() => void overnemen(false)} type="button">
                        Hand back to AVA
                      </button>
                    ) : (
                      <button className="v-btn-blauw" disabled={bezig} onClick={() => void overnemen(true)} type="button">
                        Take over
                      </button>
                    )
                  ) : null}
                </div>
              </header>
              {detail.gesprek.overgenomen_door ? (
                <p className="v-convo__mens">
                  <strong>{detail.gesprek.overgenomen_naam}</strong> is chatting. AVA is paused in this conversation; the visitor sees your messages live.
                </p>
              ) : null}
              <div className="v-convo__msgs" ref={lijst} role="log" aria-live="polite">
                {detail.berichten.length === 0 ? (
                  <p className="v-feed__empty">
                    {detail.gesprek.voorbeeld ? "This is a sample conversation without messages. Real conversations show everything that was said here." : "No messages yet."}
                  </p>
                ) : null}
                {detail.berichten.map((b) =>
                  b.rol === "systeem" ? (
                    <p className="v-tb-systeem" key={b.id}>
                      {b.tekst} · {tijdAms(sqlDate(b.created_at))}
                    </p>
                  ) : (
                    <div className={`v-tb v-tb--${b.rol === "bezoeker" ? "bezoeker" : b.rol === "mens" ? "mens" : "ava"}`} key={b.id}>
                      <p>{b.tekst}</p>
                      <time>
                        {b.rol === "bezoeker" ? detail.gesprek.bezoeker : b.rol === "mens" ? "You (team)" : "AVA"} · {tijdAms(sqlDate(b.created_at))}
                      </time>
                    </div>
                  ),
                )}
              </div>
              {detail.gesprek.lead_id ? <p className="v-convo__lead">This visitor is listed as a lead in Requests.</p> : null}
              {detail.gesprek.overgenomen_door ? (
                <form className="v-convo__invoer" onSubmit={(e) => void stuur(e)}>
                  <textarea
                    aria-label="Your message to the visitor"
                    onChange={(e) => setTekst(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={`Message ${detail.gesprek.bezoeker}…`}
                    rows={1}
                    value={tekst}
                  />
                  <button disabled={bezig || !tekst.trim()} type="submit">
                    Send
                  </button>
                </form>
              ) : detail.gesprek.kan_chatten ? (
                <p className="v-convo__hint">Want to answer yourself? Click Take over. AVA pauses and you chat directly with the visitor.</p>
              ) : null}
              {fout ? <p className="v-err">{fout}</p> : null}
            </>
          ) : (
            <p className="v-feed__empty v-pad">Choose a conversation.</p>
          )}
        </section>
      </div>
    </>
  );
}
