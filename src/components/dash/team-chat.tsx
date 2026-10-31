import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { haalBerichten, maakKanaal, maakUitnodiging, stuurBericht } from "@/lib/api/team.functions";

import { type DashData, sqlDate, tijdAms } from "./util";

type Doel = { soort: "kanaal"; id: number } | { soort: "dm"; id: number };
type Bericht = { id: number; tekst: string; soort: string; created_at: string; afzender_id: number; afzender: string };

const initialen = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
const kleurVan = (id: number) => ["blauw", "paars", "groen", "oranje", "roze"][id % 5];

export function TeamChat({ data }: { data: DashData }) {
  const router = useRouter();
  const me = data.gebruiker;
  const [doel, setDoel] = useState<Doel>({ soort: "kanaal", id: data.kanalen[0]?.id ?? 0 });
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [tekst, setTekst] = useState("");
  const [nieuwKanaal, setNieuwKanaal] = useState<string | null>(null);
  const [uitnodigen, setUitnodigen] = useState(false);
  const [uitnodiging, setUitnodiging] = useState<{ link: string; gemaild: boolean; fout?: string } | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);
  const lijst = useRef<HTMLDivElement>(null);
  const laatste = useRef(0);
  const doelRef = useRef(doel);

  const param = (d: Doel) => (d.soort === "kanaal" ? { kanaal_id: d.id } : { dm_met: d.id });

  const ververs = useCallback(async (reset = false) => {
    const d = doelRef.current;
    if (!d.id) return;
    try {
      const nieuw = await haalBerichten({ data: { ...param(d), na_id: reset ? 0 : laatste.current } });
      if (doelRef.current !== d) return;
      if (reset) setBerichten(nieuw);
      else if (nieuw.length) setBerichten((b) => [...b, ...nieuw.filter((n) => !b.some((x) => x.id === n.id))]);
      if (nieuw.length) laatste.current = nieuw[nieuw.length - 1].id;
    } catch {
      /* stil opnieuw proberen bij de volgende ronde */
    }
  }, []);

  useEffect(() => {
    doelRef.current = doel;
    laatste.current = 0;
    setBerichten([]);
    void ververs(true);
    const id = window.setInterval(() => void ververs(), 2500);
    return () => window.clearInterval(id);
  }, [doel, ververs]);

  useEffect(() => {
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight, behavior: "smooth" });
  }, [berichten.length]);

  async function verstuur(e?: FormEvent) {
    e?.preventDefault();
    const t = tekst.trim();
    if (!t) return;
    setTekst("");
    await stuurBericht({ data: { ...param(doel), tekst: t, soort: "tekst" } });
    await ververs();
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void verstuur();
    }
  }

  async function startVideo() {
    const kamer = `Volgo-${data.gebruiker.team_id}-${Math.random().toString(36).slice(2, 10)}`;
    const link = `https://meet.jit.si/${kamer}`;
    window.open(link, "_blank", "noopener");
    await stuurBericht({ data: { ...param(doel), tekst: link, soort: "video" } });
    await ververs();
  }

  async function kanaalOpslaan(e: FormEvent) {
    e.preventDefault();
    if (!nieuwKanaal || nieuwKanaal.trim().length < 2) return;
    const k = await maakKanaal({ data: { naam: nieuwKanaal } });
    setNieuwKanaal(null);
    await router.invalidate();
    setDoel({ soort: "kanaal", id: k.id });
  }

  async function nodigUit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return;
    setUitnodiging(await maakUitnodiging({ data: { email } }));
  }

  const anderen = data.leden.filter((l) => l.id !== me.id);
  const titel =
    doel.soort === "kanaal"
      ? `# ${data.kanalen.find((k) => k.id === doel.id)?.naam ?? ""}`
      : data.leden.find((l) => l.id === doel.id)?.naam ?? "";

  return (
    <div className="v-chatapp">
      <aside className="v-chatapp__side">
        <div className="v-chatapp__group">
          <div className="v-chatapp__label">
            Channels
            <button aria-label="New channel" onClick={() => setNieuwKanaal("")} type="button">
              +
            </button>
          </div>
          {data.kanalen.map((k) => (
            <button aria-current={doel.soort === "kanaal" && doel.id === k.id} className="v-chatapp__item" key={k.id} onClick={() => setDoel({ soort: "kanaal", id: k.id })} type="button">
              <span className="v-hash">#</span> {k.naam}
            </button>
          ))}
          {nieuwKanaal !== null ? (
            <form className="v-chatapp__new" onSubmit={(e) => void kanaalOpslaan(e)}>
              <input autoFocus maxLength={40} onBlur={() => !nieuwKanaal && setNieuwKanaal(null)} onChange={(e) => setNieuwKanaal(e.target.value)} placeholder="channel-name" value={nieuwKanaal} />
            </form>
          ) : null}
        </div>
        <div className="v-chatapp__group">
          <div className="v-chatapp__label">Direct</div>
          {anderen.map((l) => (
            <button aria-current={doel.soort === "dm" && doel.id === l.id} className="v-chatapp__item" key={l.id} onClick={() => setDoel({ soort: "dm", id: l.id })} type="button">
              <span className={`v-av v-av--sm v-av--${kleurVan(l.id)}`}>{initialen(l.naam)}</span> {l.naam}
            </button>
          ))}
          {anderen.length === 0 ? <p className="v-chatapp__hint">Invite your team to chat privately.</p> : null}
        </div>
        <button className="v-chatapp__invite" onClick={() => setUitnodigen(true)} type="button">
          + Invite team members
        </button>
      </aside>

      <section className="v-chatapp__main">
        <header className="v-chatapp__head">
          <h2>{titel}</h2>
          <span className="v-muted v-small">{doel.soort === "kanaal" ? `${data.leden.length} ${data.leden.length === 1 ? "member" : "members"}` : "Private chat"}</span>
          <button className="v-videobtn" onClick={() => void startVideo()} type="button">
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <rect height="10" rx="2.5" width="11" x="2.5" y="5" />
              <path d="M13.5 9l4-2.5v7l-4-2.5" />
            </svg>
            Video call
          </button>
        </header>
        <div aria-live="polite" className="v-chatapp__msgs" ref={lijst} role="log">
          {berichten.length === 0 ? <p className="v-chatapp__empty">No messages yet. Say hello to your team.</p> : null}
          {berichten.map((b, i) => {
            const vorige = berichten[i - 1];
            const groep = vorige && vorige.afzender_id === b.afzender_id && sqlDate(b.created_at).getTime() - sqlDate(vorige.created_at).getTime() < 5 * 60000;
            return (
              <div className={`v-msgrow${groep ? " is-groep" : ""}`} key={b.id}>
                {!groep ? <span className={`v-av v-av--${kleurVan(b.afzender_id)}`}>{initialen(b.afzender)}</span> : <span className="v-av-spacer" />}
                <div>
                  {!groep ? (
                    <p className="v-msgrow__meta">
                      <strong>{b.afzender_id === me.id ? "You" : b.afzender}</strong> <time>{tijdAms(sqlDate(b.created_at))}</time>
                    </p>
                  ) : null}
                  {b.soort === "video" ? (
                    <div className="v-callcard">
                      <span className="v-callcard__icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20">
                          <rect height="10" rx="2.5" width="11" x="2.5" y="5" />
                          <path d="M13.5 9l4-2.5v7l-4-2.5" />
                        </svg>
                      </span>
                      <div>
                        <strong>Video call started</strong>
                        <small>Anyone with the link can join</small>
                      </div>
                      <a href={b.tekst} rel="noopener noreferrer" target="_blank">
                        Join
                      </a>
                    </div>
                  ) : (
                    <p className="v-msgrow__text">{b.tekst}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <form className="v-chatapp__composer" onSubmit={(e) => void verstuur(e)}>
          <label className="ava-sr" htmlFor="chat-tekst">
            Message
          </label>
          <textarea id="chat-tekst" maxLength={4000} onChange={(e) => setTekst(e.target.value)} onKeyDown={onKey} placeholder={`Message ${titel}`} rows={1} value={tekst} />
          <button aria-label="Send" className="ava-send" disabled={!tekst.trim()} type="submit">
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M8 13V3.5M4 7l4-4 4 4" />
            </svg>
          </button>
        </form>
      </section>

      {uitnodigen ? (
        <div
          className="v-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setUitnodigen(false);
              setUitnodiging(null);
            }
          }}
          role="presentation"
        >
          <div aria-label="Invite team members" className="v-modal__card" role="dialog">
            <h2>Invite team members</h2>
            <p className="v-muted">Everyone gets their own login for your team.</p>
            {uitnodiging?.fout ? (
              <div className="v-upsell v-upsell--klein">
                <p>{uitnodiging.fout}</p>
                <a className="v-btn-blauw" href="/pricing?upgrade=1">See plans</a>
              </div>
            ) : uitnodiging ? (
              <>
                <p className="v-auth__ok">{uitnodiging.gemaild ? "Invitation sent by email" : "Invitation ready"}</p>
                <div className="v-copy">
                  <input readOnly value={uitnodiging.link} />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(uitnodiging.link).then(() => setGekopieerd(true), () => setGekopieerd(false));
                    }}
                    type="button"
                  >
                    {gekopieerd ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="v-muted v-small">Send this link to your colleague. It is valid for 14 days and works once.</p>
                <div className="v-modal__actions">
                  <button
                    className="v-btn-ghost"
                    onClick={() => {
                      setUitnodiging(null);
                      setGekopieerd(false);
                    }}
                    type="button"
                  >
                    Invite someone else
                  </button>
                  <button
                    className="v-btn-dark"
                    onClick={() => {
                      setUitnodigen(false);
                      setUitnodiging(null);
                    }}
                    type="button"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={(e) => void nodigUit(e)}>
                <div className="v-fld">
                  <label htmlFor="inv-email">Your colleague's email address</label>
                  <input autoFocus id="inv-email" inputMode="email" name="email" type="email" />
                </div>
                <div className="v-modal__actions">
                  <button className="v-btn-ghost" onClick={() => setUitnodigen(false)} type="button">
                    Cancel
                  </button>
                  <button className="v-btn-dark" type="submit">
                    Create invitation
                  </button>
                </div>
              </form>
            )}
            <div className="v-team">
              <p className="v-chatapp__label">Team ({data.leden.length})</p>
              {data.leden.map((l) => (
                <div className="v-team__row" key={l.id}>
                  <span className={`v-av v-av--sm v-av--${kleurVan(l.id)}`}>{initialen(l.naam)}</span>
                  <span>{l.naam}</span>
                  <small>{l.rol === "eigenaar" ? "Owner" : "Member"}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
