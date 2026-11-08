import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { beheerChat, bewaarKlant, haalBeheerChat, haalKlant, haalKlantGesprek } from "@/lib/api/beheer.functions";

import { WebsiteBeheer } from "./website-beheer";

type Data = Awaited<ReturnType<typeof haalKlant>>;
type Inst = Data["inst"];
type Bericht = { rol: "ik" | "ai"; tekst: string; gewijzigd?: string[] };

const DAGEN: [number, string][] = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
];
const SOORTEN: [string, string][] = [
  ["bellen", "Phone call"],
  ["langs", "Visit at address"],
  ["chat", "Chat appointment"],
  ["kantoor", "At the office"],
  ["insta", "Instagram DM"],
];
const tijd = (s: string) => new Date(s.includes("T") ? `${s}:00` : s.replace(" ", "T") + "Z").toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

/** The owner's view of one customer: what is wrong, their chats and appointments, every setting, and an AI helper that can change them. */
export function KlantBeheer({ id, sluit }: { id: number; sluit: () => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [inst, setInst] = useState<Inst | null>(null);
  const [fout, setFout] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [berichten, setBerichten] = useState<{ id: number; rol: string; tekst: string; created_at: string }[]>([]);
  const [chat, setChat] = useState<Bericht[]>([]);
  const [vraag, setVraag] = useState("");
  const [denkt, setDenkt] = useState(false);
  const [blad, setBlad] = useState<"overzicht" | "website">("overzicht");
  const [ververs, setVervers] = useState(0);
  const lijst = useRef<HTMLDivElement>(null);

  async function laad() {
    try {
      const r = await haalKlant({ data: { id } });
      setD(r);
      setInst(r.inst);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Couldn't load this customer.");
    }
  }
  useEffect(() => {
    void laad();
    void haalBeheerChat({ data: { id } })
      .then(setChat)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight, behavior: "smooth" });
  }, [chat, denkt]);

  async function opslaan() {
    if (!inst) return;
    setStatus("Saving…");
    try {
      const r = await bewaarKlant({
        data: {
          id,
          w: {
            naam: inst.naam,
            begroeting: inst.begroeting,
            bedrijfsinfo: inst.bedrijfsinfo,
            vragen: inst.vragen,
            kleur: inst.kleur,
            site_url: inst.site_url,
            boeken: inst.boeken,
            open_dagen: inst.open_dagen,
            open_van: inst.open_van,
            open_tot: inst.open_tot,
            afspraak_duur: inst.afspraak_duur,
            afspraak_soorten: inst.afspraak_soorten as ("bellen" | "langs" | "chat" | "kantoor" | "insta")[],
            tijdzone: inst.tijdzone,
          },
        },
      });
      setStatus(r.ok ? "Saved. Live on their website." : r.message);
      if (r.ok) void laad();
    } catch {
      setStatus("Couldn't save. Check the fields (website must start with https://).");
    }
  }
  async function toonGesprek(gid: number) {
    if (open === gid) return setOpen(null);
    setOpen(gid);
    setBerichten(await haalKlantGesprek({ data: { id, gesprek: gid } }));
  }
  async function stuur(e?: FormEvent) {
    e?.preventDefault();
    const v = vraag.trim();
    if (!v || denkt) return;
    const historie = chat.slice(-12).map(({ rol, tekst }) => ({ rol, tekst }));
    setChat((c) => [...c, { rol: "ik", tekst: v }]);
    setVraag("");
    setDenkt(true);
    try {
      const r = await beheerChat({ data: { id, historie, vraag: v } });
      setChat((c) => [...c, { rol: "ai", tekst: r.antwoord, gewijzigd: r.gewijzigd }]);
      if (r.gewijzigd.length) {
        void laad();
        setVervers((n) => n + 1);
      }
    } catch {
      setChat((c) => [...c, { rol: "ai", tekst: "That didn't work. Try again." }]);
    } finally {
      setDenkt(false);
    }
  }

  if (fout)
    return (
      <div className="v-kb">
        <button className="v-kb__terug" onClick={sluit} type="button">
          ← All customers
        </button>
        <p className="v-err">{fout}</p>
      </div>
    );
  if (!d || !inst) return <p className="v-feed__empty">Loading customer…</p>;
  const zet = <K extends keyof Inst>(k: K, v: Inst[K]) => {
    setInst({ ...inst, [k]: v });
    setStatus("");
  };
  const host = typeof window !== "undefined" ? window.location.origin : "https://thevolgo.app";
  const code = `<script src="${host}/ava.js" data-key="${inst.sleutel}" defer></script>`;

  return (
    <div className="v-kb">
      <button className="v-kb__terug" onClick={sluit} type="button">
        ← All customers
      </button>
      <header className="v-kb__kop">
        <div>
          <h2>{d.klant.bedrijf}</h2>
          <p>
            {d.klant.naam} · {d.klant.email} · {d.klant.planNaam} · {d.klant.status}
          </p>
        </div>
        {inst.site_url ? (
          <a className="v-kb__knop2" href={inst.site_url} rel="noopener noreferrer" target="_blank">
            Open their website ↗
          </a>
        ) : null}
      </header>

      <nav aria-label="Customer" className="v-kb__tabs">
        <button aria-current={blad === "overzicht" ? "page" : undefined} onClick={() => setBlad("overzicht")} type="button">
          Chat &amp; calendar
        </button>
        <button aria-current={blad === "website" ? "page" : undefined} onClick={() => setBlad("website")} type="button">
          Website
        </button>
      </nav>

      <div className="v-kb__raster">
        {blad === "website" ? (
          <div className="v-kb__links">
            <WebsiteBeheer bedrijf={d.klant.bedrijf} id={id} ververs={ververs} />
          </div>
        ) : (
        <div className="v-kb__links">
          <section className="v-kb__blok">
            <h3>What needs attention</h3>
            {d.problemen.length ? (
              <ul className="v-kb__problemen">
                {d.problemen.map((p) => (
                  <li className={`is-${p.ernst}`} key={p.tekst}>
                    {p.tekst}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v-kb__leeg">Everything looks good.</p>
            )}
          </section>

          <section className="v-kb__blok">
            <h3>Assistant</h3>
            <div className="v-kb__velden">
              <label>
                <span>Name</span>
                <input maxLength={30} onChange={(e) => zet("naam", e.target.value)} value={inst.naam} />
              </label>
              <label>
                <span>Colour</span>
                <input onChange={(e) => zet("kleur", e.target.value)} type="color" value={inst.kleur} />
              </label>
              <label className="is-breed">
                <span>First message</span>
                <textarea onChange={(e) => zet("begroeting", e.target.value)} rows={2} value={inst.begroeting} />
              </label>
              <label className="is-breed">
                <span>Business information (services, area, prices, hours)</span>
                <textarea onChange={(e) => zet("bedrijfsinfo", e.target.value)} rows={7} value={inst.bedrijfsinfo} />
              </label>
              <label className="is-breed">
                <span>Questions before an appointment (one per line)</span>
                <textarea onChange={(e) => zet("vragen", e.target.value)} rows={4} value={inst.vragen} />
              </label>
              <label className="is-breed">
                <span>Website</span>
                <input onChange={(e) => zet("site_url", e.target.value)} placeholder="https://" value={inst.site_url} />
              </label>
            </div>
          </section>

          <section className="v-kb__blok">
            <h3>Calendar</h3>
            <label className="v-kb__aan">
              <input checked={inst.boeken} onChange={(e) => zet("boeken", e.target.checked)} type="checkbox" /> Visitors can book appointments in the chat
            </label>
            <div className="v-kb__chips">
              {DAGEN.map(([n, t]) => (
                <button aria-pressed={inst.open_dagen.includes(n)} key={n} onClick={() => zet("open_dagen", inst.open_dagen.includes(n) ? inst.open_dagen.filter((x) => x !== n) : [...inst.open_dagen, n])} type="button">
                  {t}
                </button>
              ))}
            </div>
            <div className="v-kb__velden">
              <label>
                <span>From</span>
                <input onChange={(e) => zet("open_van", e.target.value)} type="time" value={inst.open_van} />
              </label>
              <label>
                <span>Until</span>
                <input onChange={(e) => zet("open_tot", e.target.value)} type="time" value={inst.open_tot} />
              </label>
              <label>
                <span>Minutes per appointment</span>
                <input max={240} min={15} onChange={(e) => zet("afspraak_duur", Number(e.target.value))} step={15} type="number" value={inst.afspraak_duur} />
              </label>
              <label>
                <span>Time zone</span>
                <input onChange={(e) => zet("tijdzone", e.target.value)} value={inst.tijdzone} />
              </label>
            </div>
            <div className="v-kb__chips">
              {SOORTEN.map(([s, t]) => (
                <button aria-pressed={inst.afspraak_soorten.includes(s)} key={s} onClick={() => zet("afspraak_soorten", inst.afspraak_soorten.includes(s) ? inst.afspraak_soorten.filter((x) => x !== s) : [...inst.afspraak_soorten, s])} type="button">
                  {t}
                </button>
              ))}
            </div>
          </section>

          <div className="v-kb__opslaan">
            <button className="v-kb__knop" onClick={() => void opslaan()} type="button">
              Save changes
            </button>
            {status ? <span>{status}</span> : null}
          </div>

          <section className="v-kb__blok">
            <h3>Install code</h3>
            <p className="v-kb__leeg">Paste this just before &lt;/body&gt; on their website.</p>
            <div className="v-kb__code">
              <code>{code}</code>
              <button className="v-kb__knop2" onClick={() => void navigator.clipboard?.writeText(code)} type="button">
                Copy
              </button>
            </div>
          </section>

          <section className="v-kb__blok">
            <h3>Chats ({d.gesprekken.length})</h3>
            {d.gesprekken.length ? (
              <ul className="v-kb__lijst">
                {d.gesprekken.map((g) => (
                  <li key={g.id}>
                    <button className="v-kb__rij" onClick={() => void toonGesprek(g.id)} type="button">
                      <b>{g.bezoeker}</b>
                      <span>{g.onderwerp}</span>
                      <small>
                        {g.berichten} msg · {tijd(g.laatste)}
                      </small>
                    </button>
                    {open === g.id ? (
                      <div className="v-kb__gesprek">
                        {berichten.map((b) => (
                          <p className={`is-${b.rol}`} key={b.id}>
                            {b.tekst}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v-kb__leeg">No real chats yet.</p>
            )}
          </section>

          <section className="v-kb__blok">
            <h3>Appointments ({d.afspraken.length})</h3>
            {d.afspraken.length ? (
              <ul className="v-kb__lijst">
                {d.afspraken.map((a) => (
                  <li className="v-kb__rij v-kb__rij--plat" key={a.id}>
                    <b>{tijd(a.start)}</b>
                    <span>{a.titel}</span>
                    <small>{[a.locatie, a.notitie?.replace(/\n/g, " · ")].filter(Boolean).join(" · ")}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v-kb__leeg">No appointments yet.</p>
            )}
          </section>

          <section className="v-kb__blok">
            <h3>Requests ({d.leads.length})</h3>
            {d.leads.length ? (
              <ul className="v-kb__lijst">
                {d.leads.map((l) => (
                  <li className="v-kb__rij v-kb__rij--plat" key={l.id}>
                    <b>{l.naam}</b>
                    <span>{l.onderwerp}</span>
                    <small>
                      {l.status} · {tijd(l.created_at)}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v-kb__leeg">No requests yet.</p>
            )}
          </section>
        </div>
        )}

        <aside className="v-kb__ai" aria-label="AI helper">
          <div className="v-kb__aikop">
            <b>Ask Claude</b>
            <small>Changes the chat, calendar and website of {d.klant.bedrijf}, and finds what goes wrong.</small>
          </div>
          <div className="v-kb__aiberichten" ref={lijst}>
            {!chat.length ? (
              <div className="v-kb__voorbeelden">
                {(blad === "website"
                  ? ["Make the headline bigger and calmer", "Add a page Tuinonderhoud with prices from €45 per hour", "Check the website for problems", "Use the photo I uploaded on the homepage"]
                  : ["What is wrong with this customer?", "Add a question: what is your address?", "Open on Saturday from 9:00 to 13:00", "Summarise the last chats"]
                ).map((v) => (
                  <button key={v} onClick={() => setVraag(v)} type="button">
                    {v}
                  </button>
                ))}
              </div>
            ) : null}
            {chat.map((b, i) => (
              <div className={`v-kb__bel is-${b.rol}`} key={i}>
                <p>{b.tekst}</p>
                {b.gewijzigd?.length ? <small>Changed: {b.gewijzigd.join(", ")}</small> : null}
              </div>
            ))}
            {denkt ? <div className="v-kb__bel is-ai is-denkt">Thinking…</div> : null}
          </div>
          <form className="v-kb__aiform" onSubmit={(e) => void stuur(e)}>
            <textarea
              onChange={(e) => setVraag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void stuur();
                }
              }}
              placeholder="Tell Claude what to change…"
              rows={2}
              value={vraag}
            />
            <button disabled={denkt || !vraag.trim()} type="submit">
              Send
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
