import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { haalGesprek, haalGesprekken, neemGesprekOver, stuurMensBericht } from "@/lib/api/ava.functions";

import { type DashData, dagLabel, datumKort, geleden, sqlDate, tijdAms } from "./util";

type Detail = NonNullable<Awaited<ReturnType<typeof haalGesprek>>>;
type Item = Awaited<ReturnType<typeof haalGesprekken>>[number];

// Avatar colours: all at least 5:1 against the white initials.
const KLEUREN = ["#0f66c2", "#6d28d9", "#0b7a5c", "#c2410c", "#b0204f", "#0b6578", "#4059d6", "#8a6a00"];
const initialen = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

function Avatar({ naam, id, live }: { naam: string; id: number; live?: boolean }) {
  return (
    <span className="v-dm__av" style={{ background: KLEUREN[id % KLEUREN.length] }}>
      {initialen(naam === "Website visitor" || naam === "Websitebezoeker" ? "?" : naam)}
      {live ? <i aria-label="Online" role="img" /> : null}
    </span>
  );
}

const SEEN = "volgo-seen-";
function gezien(id: number): string {
  try {
    return localStorage.getItem(SEEN + id) ?? "";
  } catch {
    return "";
  }
}
function markeerGezien(id: number, laatste: string) {
  try {
    localStorage.setItem(SEEN + id, laatste);
  } catch {
    /* private mode */
  }
}

/** Short time for the chat list: 14:05 today, otherwise "3 Nov". */
function kortTijd(d: Date, nu: number) {
  return nu - d.getTime() < 20 * 3600 * 1000 ? tijdAms(d) : datumKort(d);
}

export function Gesprekken({ data }: { data: DashData }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [alleenLive, setAlleenLive] = useState(false);
  const [zoekChat, setZoekChat] = useState("");
  const [actief, setActief] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [nu, setNu] = useState(() => Date.parse(data.nu));
  const [tekst, setTekst] = useState("");
  const [open, setOpen] = useState(false); // mobile: chat open instead of list
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [lijstFout, setLijstFout] = useState(false);
  const lijst = useRef<HTMLDivElement>(null);

  // Chat list refreshes by itself, so new visitors appear without reloading. A failed refresh is shown, never passed off as "no chats".
  const laadLijst = useCallback(async () => {
    const r = await haalGesprekken().catch(() => null);
    if (!r) {
      setLijstFout(true);
      return;
    }
    setLijstFout(false);
    setItems(r);
    if (r[0]) setNu(sqlDate(r[0].nu).getTime());
    setActief((a) => a ?? (window.matchMedia("(max-width: 900px)").matches ? null : (r[0]?.id ?? null)));
  }, []);
  useEffect(() => {
    void laadLijst();
    const id = window.setInterval(() => void laadLijst(), 4000);
    return () => window.clearInterval(id);
  }, [laadLijst]);

  const laad = useCallback(async () => {
    if (actief === null) return;
    const d = await haalGesprek({ data: { id: actief } }).catch(() => null);
    setDetail(d);
    if (d) markeerGezien(d.gesprek.id, d.gesprek.laatste);
  }, [actief]);
  useEffect(() => {
    if (actief === null) return;
    setDetail(null);
    setFout("");
    setTekst("");
    void laad();
    const id = window.setInterval(() => void laad(), 2500);
    return () => window.clearInterval(id);
  }, [actief, laad]);

  const aantal = detail?.berichten.length ?? 0;
  useEffect(() => {
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight });
  }, [aantal, detail?.gesprek.id]);

  const ikChat = Boolean(detail?.gesprek.overgenomen_door);

  async function zetModus(zelf: boolean) {
    if (!detail || bezig || zelf === ikChat) return;
    setBezig(true);
    await neemGesprekOver({ data: { id: detail.gesprek.id, aan: zelf } }).catch(() => null);
    await Promise.all([laad(), laadLijst()]);
    setBezig(false);
  }
  async function stuur(e?: FormEvent) {
    e?.preventDefault();
    const t = tekst.trim();
    if (!t || !detail || bezig) return;
    setBezig(true);
    // Typing while AVA is on? Then you take over automatically.
    if (!ikChat) await neemGesprekOver({ data: { id: detail.gesprek.id, aan: true } }).catch(() => null);
    setTekst("");
    const r = await stuurMensBericht({ data: { id: detail.gesprek.id, tekst: t } }).catch(() => ({ ok: false as const, message: "Not sent. Try again." }));
    if (!r.ok) {
      setFout(r.message);
      setTekst(t);
    } else setFout("");
    await Promise.all([laad(), laadLijst()]);
    setBezig(false);
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void stuur();
    }
  }

  const isLive = (g: { laatste: string; status: string }) => g.status === "live" && nu - sqlDate(g.laatste).getTime() < 10 * 60000;
  const g = detail?.gesprek;
  const kanChatten = Boolean(g?.kan_chatten);
  const berichten = detail?.berichten ?? [];

  return (
    <>
      <header className="v-dash__head">
        <h1>Chats</h1>
        <p>Everyone talking to AVA on your website, live. Open a chat and switch between AVA and yourself.</p>
      </header>
      <div className={`v-dm${open ? " is-open" : ""}`}>
        <aside className="v-dm__list" aria-label="Chats">
          <div className="v-dm__filter">
            <div aria-label="Filter chats" className="v-instel__nav" role="group">
              <button aria-current={!alleenLive ? "page" : undefined} aria-pressed={!alleenLive} onClick={() => setAlleenLive(false)} type="button">
                All
              </button>
              <button aria-current={alleenLive ? "page" : undefined} aria-pressed={alleenLive} onClick={() => setAlleenLive(true)} type="button">
                Live <span className="v-leadbalk__n">{items?.filter(isLive).length ?? 0}</span>
              </button>
            </div>
            <input aria-label="Search chats" className="v-leadbalk__zoek" onChange={(e) => setZoekChat(e.target.value)} placeholder="Search" type="search" value={zoekChat} />
          </div>
          {items === null && !lijstFout ? (
            <p className="v-dm__leeg" role="status">
              Loading chats…
            </p>
          ) : null}
          {lijstFout ? (
            <p className="v-dm__leeg v-dm__leeg--fout" role="alert">
              Couldn’t load your chats. Check your connection.{" "}
              <button className="v-linkbtn" onClick={() => void laadLijst()} type="button">
                Try again
              </button>
            </p>
          ) : null}
          {items?.length === 0 && !lijstFout ? (
            <div className="v-dm__leeg">
              <p>
                <strong>No chats yet.</strong>
              </p>
              <p>As soon as someone talks to AVA on your website, the conversation appears here, live.</p>
              {!data.avaLive ? (
                <p>
                  Not live yet? <a href={`/demo/${data.sleutel}`} rel="noopener" target="_blank">Try AVA yourself</a> or open <strong>Install</strong> to put it on your website.
                </p>
              ) : null}
            </div>
          ) : null}
          {items && items.length > 0 && items.filter((c) => (!alleenLive || isLive(c)) && (!zoekChat.trim() || `${c.bezoeker} ${c.onderwerp}`.toLowerCase().includes(zoekChat.trim().toLowerCase()))).length === 0 ? (
            <p className="v-dm__leeg">Nothing matches.</p>
          ) : null}
          {items?.filter((c) => (!alleenLive || isLive(c)) && (!zoekChat.trim() || `${c.bezoeker} ${c.onderwerp}`.toLowerCase().includes(zoekChat.trim().toLowerCase()))).map((c) => {
            const live = isLive(c);
            const wie = c.laatste_rol === "bezoeker" ? "" : c.laatste_rol === "mens" ? "You: " : c.laatste_rol === "systeem" ? "" : "AVA: ";
            const ongelezen = c.laatste_rol === "bezoeker" && !c.voorbeeld && gezien(c.id) !== c.laatste && actief !== c.id;
            return (
              <button
                aria-current={actief === c.id}
                className={`v-dm__item${live ? " is-live" : ""}${ongelezen ? " is-ongelezen" : ""}`}
                key={c.id}
                onClick={() => {
                  setActief(c.id);
                  setOpen(true);
                }}
                type="button"
              >
                <Avatar id={c.id} live={live} naam={c.bezoeker} />
                <span className="v-dm__wat">
                  <span className="v-dm__rij">
                    <strong>
                      {c.bezoeker}
                      {c.voorbeeld ? <em className="v-voorbeeld-tag">Sample</em> : null}
                    </strong>
                    <time>{kortTijd(sqlDate(c.laatste), nu)}</time>
                  </span>
                  <span className="v-dm__rij">
                    <span className="v-dm__voorbeeld">{c.laatste_tekst ? wie + c.laatste_tekst : c.onderwerp}</span>
                    {ongelezen ? <i aria-label="Unread" className="v-dm__dot" /> : c.overgenomen_naam ? <em className="v-dm__tag v-dm__tag--jij">You</em> : live ? <em className="v-dm__tag">AVA</em> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </aside>

        <section className="v-dm__chat">
          {g ? (
            <>
              <header className="v-dm__kop">
                <button aria-label="Back to chats" className="v-dm__terug" onClick={() => setOpen(false)} type="button">
                  ‹
                </button>
                <Avatar id={g.id} live={isLive(g)} naam={g.bezoeker} />
                <div className="v-dm__wie">
                  <strong>{g.bezoeker}</strong>
                  <small>
                    {isLive(g) ? "Online now" : `Last message ${geleden(sqlDate(g.laatste), nu)}`}
                    {g.contact ? ` · ${g.contact}` : ""}
                  </small>
                </div>
                {kanChatten ? (
                  <div className="v-dm__modus" role="group" aria-label="Who answers">
                    <button aria-pressed={!ikChat} disabled={bezig} onClick={() => void zetModus(false)} type="button">
                      AVA auto
                    </button>
                    <button aria-pressed={ikChat} disabled={bezig} onClick={() => void zetModus(true)} type="button">
                      Take over
                    </button>
                  </div>
                ) : null}
              </header>

              {ikChat ? (
                <div className="v-dm__banner">
                  <span>
                    <b>You’re answering.</b> AVA is paused for this chat.
                  </span>
                  <button disabled={bezig} onClick={() => void zetModus(false)} type="button">
                    Hand back to AVA
                  </button>
                </div>
              ) : null}
              <div className="v-dm__berichten" ref={lijst} role="log" aria-live="polite">
                {berichten.length === 0 ? <p className="v-dm__leeg">{g.voorbeeld ? "Sample chat without messages." : "No messages yet."}</p> : null}
                {berichten.map((b, i) => {
                  const vorige = berichten[i - 1];
                  const chip = !vorige || dagLabel(sqlDate(vorige.created_at), nu) !== dagLabel(sqlDate(b.created_at), nu) ? <p className="v-dm__dag" key={`d${b.id}`}>{dagLabel(sqlDate(b.created_at), nu)}</p> : null;
                  if (b.rol === "systeem")
                    return (
                      <div key={b.id}>
                        {chip}
                        <p className="v-dm__sys">{b.tekst}</p>
                      </div>
                    );
                  const kant = b.rol === "bezoeker" ? "zij" : "wij";
                  const volgende = berichten[i + 1];
                  const laatsteVanReeks = !volgende || volgende.rol !== b.rol;
                  const eersteVanReeks = !vorige || vorige.rol !== b.rol;
                  return (
                    <div className="v-dm__groep" key={b.id}>
                      {chip}
                      <div className={`v-dm__b v-dm__b--${kant}${b.rol === "mens" ? " is-mens" : ""}${eersteVanReeks ? " is-eerste" : ""}${laatsteVanReeks ? " is-laatste" : ""}`}>
                        <p>{b.tekst}</p>
                        {laatsteVanReeks ? (
                          <time>
                            {b.rol === "mens" ? "You" : b.rol === "bezoeker" ? "" : "AVA"}
                            {b.rol === "bezoeker" ? "" : " · "}
                            {tijdAms(sqlDate(b.created_at))}
                            {b.rol === "mens" ? <span aria-label="Sent" className="v-dm__vink">✓</span> : null}
                          </time>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {g.lead_id ? <p className="v-dm__lead">✓ Saved as a lead — find it under Leads</p> : null}
              {detail.herkomst || detail.bezoek.length ? (
                <details className="v-dm__bezoek">
                  <summary>
                    {detail.herkomst ? `📍 ${detail.herkomst}` : "Visit details"}
                    {detail.bezoek.length ? ` · ${detail.bezoek.length} ${detail.bezoek.length === 1 ? "page" : "pages"} viewed` : ""}
                    {detail.bezoek[0]?.bron ? ` · via ${detail.bezoek[0].bron}` : ""}
                  </summary>
                  <ol>
                    {detail.bezoek.map((v, i) => (
                      <li key={i}>
                        <time>{tijdAms(sqlDate(v.created_at))}</time>
                        <span>{v.titel || v.pad}</span>
                        <small>{v.pad}</small>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}

              {kanChatten ? (
                <form className={`v-dm__invoer${ikChat ? " is-jij" : ""}`} onSubmit={(e) => void stuur(e)}>
                  <textarea
                    aria-label="Your message"
                    onChange={(e) => setTekst(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={ikChat ? `Message ${g.bezoeker}…` : "AVA is answering. Type here to take over…"}
                    rows={1}
                    value={tekst}
                  />
                  <button aria-label="Send" disabled={bezig || !tekst.trim()} type="submit">
                    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24" width="18">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                </form>
              ) : null}
              {fout ? <p className="v-err v-dm__fout">{fout}</p> : null}
            </>
          ) : (
            <div className="v-dm__niks">
              <span aria-hidden="true" className="v-dm__niks-ico">💬</span>
              <p>
                <strong>Your conversations</strong>
                <br />
                Pick a chat on the left to read along or take over from AVA.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
