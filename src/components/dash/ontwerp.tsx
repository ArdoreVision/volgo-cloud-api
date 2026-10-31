import { useEffect, useMemo, useRef, useState } from "react";

import { bewaarOntwerp, controleerSite, haalOntwerp } from "@/lib/api/ava.functions";

type Stijl = {
  avatar: string | null;
  positie: "rechts" | "links";
  thema: "licht" | "donker" | "auto";
  vorm: "rond" | "zacht" | "strak";
  lettertype: "systeem" | "website";
  knoptekst: string;
  branding: boolean;
  knop: "pil" | "bol" | "icoon";
  grootte: "compact" | "normaal" | "groot";
  afstand: number;
  zij: number;
  uitnodiging: string;
};
type Ontwerp = { kleur: string; begroeting: string; site: string; stijl: Stijl };
type Data = Awaited<ReturnType<typeof haalOntwerp>>;

const KLEUREN = ["#1677d9", "#111318", "#1f9d55", "#e07a10", "#c4211b", "#6d4fd8", "#0e9aa7", "#d63384"];

/** Resize an uploaded photo to a 160×160 square, small enough to store. */
function verklein(file: File): Promise<string> {
  return new Promise((ok, fout) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      const ctx = c.getContext("2d");
      if (!ctx) return fout(new Error("canvas"));
      const z = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - z) / 2, (img.height - z) / 2, z, z, 0, 0, 160, 160);
      ok(c.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => fout(new Error("image"));
    img.src = URL.createObjectURL(file);
  });
}

function Groep({ titel, open, pro, kind, onToggle }: { titel: string; open: boolean; pro?: boolean; kind: React.ReactNode; onToggle: () => void }) {
  return (
    <div className={`v-ed__groep${open ? " is-open" : ""}`}>
      <button aria-expanded={open} className="v-ed__groepkop" onClick={onToggle} type="button">
        <span>{titel}</span>
        {pro ? <em className="v-ed__pro">Pro</em> : null}
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>
      {open ? <div className="v-ed__groepin">{kind}</div> : null}
    </div>
  );
}

function Kaarten<T extends string>({ waarde, opties, onChange, slot }: { waarde: T; opties: [T, string, React.ReactNode][]; onChange: (v: T) => void; slot: boolean }) {
  return (
    <div className="v-ed__kaarten" role="radiogroup">
      {opties.map(([v, l, beeld]) => (
        <button aria-checked={waarde === v} className={waarde === v ? "is-aan" : ""} disabled={slot} key={v} onClick={() => onChange(v)} role="radio" type="button">
          <span className="v-ed__mini">{beeld}</span>
          <small>{l}</small>
        </button>
      ))}
    </div>
  );
}

function Seg<T extends string>({ label, waarde, opties, onChange, slot }: { label: string; waarde: T; opties: [T, string][]; onChange: (v: T) => void; slot: boolean }) {
  return (
    <div className="v-fld">
      <span className="v-fld__label">{label}</span>
      <div aria-label={label} className="v-seg" role="radiogroup">
        {opties.map(([v, l]) => (
          <button aria-checked={waarde === v} aria-selected={waarde === v} disabled={slot} key={v} onClick={() => onChange(v)} role="radio" type="button">
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OntwerpEditor({ terug }: { terug: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [o, setO] = useState<Ontwerp | null>(null);
  const [bewaard, setBewaard] = useState("");
  const [apparaat, setApparaat] = useState<"desktop" | "mobiel">("desktop");
  const [chatOpen, setChatOpen] = useState(false);
  const [open, setOpen] = useState<string>("knop");
  const [siteInvoer, setSiteInvoer] = useState("");
  const [siteMelding, setSiteMelding] = useState("");
  const [toonSite, setToonSite] = useState("");
  const [status, setStatus] = useState<"" | "bezig" | "ok" | "fout">("");
  const frame = useRef<HTMLIFrameElement>(null);
  const bestand = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void haalOntwerp().then((d) => {
      setData(d);
      const begin: Ontwerp = { kleur: d.kleur, begroeting: d.begroeting, site: d.site, stijl: d.stijl as Stijl };
      setO(begin);
      setBewaard(JSON.stringify(begin));
      setSiteInvoer(d.site);
      if (d.site) void kijk(d.site, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gewijzigd = o !== null && JSON.stringify(o) !== bewaard;
  const slot = !data?.magStijl;

  // What the widget in the preview should look like right now (unsaved changes included).
  const live = useMemo(() => {
    if (!o) return null;
    const s = slot ? { ...o.stijl, avatar: null, positie: "rechts", thema: "licht", vorm: "rond", lettertype: "systeem", knoptekst: "", branding: true, knop: "pil", grootte: "normaal", afstand: 18, zij: 18, uitnodiging: "" } : o.stijl;
    return { ...s, kleur: o.kleur, begroeting: o.begroeting };
  }, [o, slot]);

  const stuur = (bericht: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(bericht, window.location.origin);
  useEffect(() => {
    if (live) stuur({ volgo: "stijl", c: live });
  }, [live]);
  useEffect(() => {
    stuur({ volgo: chatOpen ? "open" : "dicht" });
  }, [chatOpen]);
  useEffect(() => {
    const ontvang = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.volgo === "klaar" && live) {
        stuur({ volgo: "stijl", c: live });
        if (chatOpen) stuur({ volgo: "open" });
      }
    };
    window.addEventListener("message", ontvang);
    return () => window.removeEventListener("message", ontvang);
  }, [live, chatOpen]);

  // Leaving with unsaved changes: ask first (like Shopify).
  useEffect(() => {
    const voor = (e: BeforeUnloadEvent) => {
      if (gewijzigd) e.preventDefault();
    };
    window.addEventListener("beforeunload", voor);
    return () => window.removeEventListener("beforeunload", voor);
  }, [gewijzigd]);

  async function kijk(adres: string, opslaanInConcept = true) {
    if (!adres.trim()) {
      setToonSite("");
      setSiteMelding("");
      if (opslaanInConcept) setO((x) => (x ? { ...x, site: "" } : x));
      return;
    }
    setSiteMelding("Checking your website…");
    const r = await controleerSite({ data: { url: adres } }).catch(() => null);
    if (!r || !r.ok) {
      setSiteMelding(r && !r.ok ? r.reden : "Couldn't check that address. Try again.");
      return;
    }
    if (opslaanInConcept) setO((x) => (x ? { ...x, site: r.url } : x));
    setSiteInvoer(r.url);
    if (r.inbedden && r.bereikbaar) {
      setToonSite(r.url);
      setSiteMelding("");
    } else {
      setToonSite("");
      setSiteMelding(
        r.bereikbaar
          ? "Your website doesn't allow being shown inside other pages, so the preview uses a sample site. AVA will look exactly like this on your real site."
          : "We couldn't open your website right now, so the preview uses a sample site.",
      );
    }
  }

  if (!data || !o || !live) return <div className="v-ed v-ed--laden">Loading the editor…</div>;

  const zet = <K extends keyof Stijl>(k: K, v: Stijl[K]) => setO((x) => (x ? { ...x, stijl: { ...x.stijl, [k]: v } } : x));
  const foto = o.stijl.avatar ?? "/assets/volgo/ava.png";
  const src = `/ava-preview?k=${encodeURIComponent(data.sleutel)}${toonSite ? `&u=${encodeURIComponent(toonSite)}` : ""}`;

  async function opslaan() {
    if (!o) return;
    setStatus("bezig");
    const r = await bewaarOntwerp({ data: o }).catch(() => null);
    if (r?.ok) {
      setBewaard(JSON.stringify(o));
      setStatus("ok");
      setTimeout(() => setStatus(""), 2500);
    } else setStatus("fout");
  }

  const mini = {
    pil: (
      <span className="m-pil" style={{ ["--c" as string]: o.kleur }}>
        <i />
        <b />
      </span>
    ),
    bol: (
      <span className="m-bol" style={{ ["--c" as string]: o.kleur }}>
        <i />
      </span>
    ),
    icoon: (
      <span className="m-ico" style={{ background: o.kleur }}>
        <svg viewBox="0 0 24 24">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" />
        </svg>
      </span>
    ),
  };
  const vorm = (r: number) => (
    <span className="m-vorm" style={{ borderRadius: r }}>
      <i style={{ borderRadius: Math.max(3, r / 2), background: o.kleur }} />
      <i style={{ borderRadius: Math.max(3, r / 2) }} />
    </span>
  );

  return (
    <div className="v-ed">
      <header className="v-ed__balk">
        <button className="v-ed__terug" onClick={() => (!gewijzigd || confirm("Leave without saving your changes?") ? terug() : undefined)} type="button">
          ← Exit
        </button>
        <strong className="v-ed__titel">Customize AVA</strong>
        <div aria-label="Device" className="v-ed__apparaat" role="radiogroup">
          {(
            [
              ["desktop", "Desktop", "M3 4.5h14v9H3zM7 16.5h6M10 13.5v3"],
              ["mobiel", "Mobile", "M7 2.5h6a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1zM9.5 15h1"],
            ] as const
          ).map(([v, l, d]) => (
            <button aria-checked={apparaat === v} aria-label={l} className={apparaat === v ? "is-aan" : ""} key={v} onClick={() => setApparaat(v)} role="radio" title={l} type="button">
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <path d={d} />
              </svg>
            </button>
          ))}
        </div>
        <button className={`v-ed__chatknop${chatOpen ? " is-aan" : ""}`} onClick={() => setChatOpen(!chatOpen)} type="button">
          {chatOpen ? "Close chat" : "Open chat"}
        </button>
        <span className={`v-ed__staat${gewijzigd ? " is-gewijzigd" : ""}`}>{status === "ok" ? "Saved ✓" : status === "fout" ? "Couldn't save" : gewijzigd ? "Unsaved changes" : "All changes saved"}</span>
        {gewijzigd ? (
          <button className="v-ed__weg" onClick={() => setO(JSON.parse(bewaard) as Ontwerp)} type="button">
            Discard
          </button>
        ) : null}
        <button className="v-btn-blauw v-ed__opslaan" disabled={!gewijzigd || status === "bezig"} onClick={() => void opslaan()} type="button">
          {status === "bezig" ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="v-ed__werk">
        <aside className="v-ed__zij">
          {slot ? (
            <div className="v-ed__upsell">
              <strong>Make AVA look like your brand</strong>
              <p>Button style, shape, size, theme, position, photo and invitation bubble are part of Pro and Premium. You can preview them here; colour and greeting work on every plan.</p>
            </div>
          ) : null}

          <Groep
            kind={
              <>
                <div className="v-fld">
                  <label htmlFor="ed-site">Website address</label>
                  <div className="v-ed__rij">
                    <input id="ed-site" onChange={(e) => setSiteInvoer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void kijk(siteInvoer)} placeholder="https://yourwebsite.com" value={siteInvoer} />
                    <button className="v-dash__logout" onClick={() => void kijk(siteInvoer)} type="button">
                      Show
                    </button>
                  </div>
                </div>
                {siteMelding ? <p className="v-ed__hint">{siteMelding}</p> : <p className="v-ed__hint">See AVA on your own website while you design. Nothing changes on your site until AVA is installed.</p>}
              </>
            }
            onToggle={() => setOpen(open === "site" ? "" : "site")}
            open={open === "site"}
            titel="Your website"
          />

          <Groep
            kind={
              <>
                <span className="v-fld__label">Brand colour</span>
                <div className="v-ed__kleuren">
                  {KLEUREN.map((k) => (
                    <button aria-label={k} className={o.kleur.toLowerCase() === k ? "is-aan" : ""} key={k} onClick={() => setO({ ...o, kleur: k })} style={{ background: k }} type="button" />
                  ))}
                  <label className="v-ed__eigen" title="Own colour">
                    <input onChange={(e) => setO({ ...o, kleur: e.target.value })} type="color" value={o.kleur} />
                    <span style={{ background: o.kleur }} />
                  </label>
                </div>
                <Seg label="Theme" onChange={(v) => zet("thema", v)} opties={[["licht", "Light"], ["donker", "Dark"], ["auto", "Auto"]]} slot={slot} waarde={o.stijl.thema} />
                <Seg label="Font" onChange={(v) => zet("lettertype", v)} opties={[["website", "My website's font"], ["systeem", "Standard"]]} slot={slot} waarde={o.stijl.lettertype} />
              </>
            }
            onToggle={() => setOpen(open === "kleur" ? "" : "kleur")}
            open={open === "kleur"}
            titel="Colour & theme"
          />

          <Groep
            kind={
              <>
                <span className="v-fld__label">Button style</span>
                <Kaarten onChange={(v) => zet("knop", v)} opties={[["pil", "Photo + text", mini.pil], ["bol", "Photo only", mini.bol], ["icoon", "Chat icon", mini.icoon]]} slot={slot} waarde={o.stijl.knop} />
                {o.stijl.knop === "pil" ? (
                  <div className="v-fld">
                    <label htmlFor="ed-knop">Button text</label>
                    <input disabled={slot} id="ed-knop" maxLength={30} onChange={(e) => zet("knoptekst", e.target.value)} placeholder={`Ask ${data.naam}`} value={o.stijl.knoptekst} />
                  </div>
                ) : null}
                <div className="v-fld">
                  <span className="v-fld__label">Photo of AVA</span>
                  <div className="v-stijl__foto">
                    <img alt="" src={foto} />
                    <button className="v-dash__logout" disabled={slot} onClick={() => bestand.current?.click()} type="button">
                      Upload photo
                    </button>
                    {o.stijl.avatar ? (
                      <button className="v-linkbtn--rood" onClick={() => zet("avatar", null)} type="button">
                        Remove
                      </button>
                    ) : null}
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) zet("avatar", await verklein(f).catch(() => null));
                        e.target.value = "";
                      }}
                      ref={bestand}
                      type="file"
                    />
                  </div>
                </div>
              </>
            }
            onToggle={() => setOpen(open === "knop" ? "" : "knop")}
            open={open === "knop"}
            pro={slot}
            titel="Chat button"
          />

          <Groep
            kind={
              <>
                <span className="v-fld__label">Shape</span>
                <Kaarten onChange={(v) => zet("vorm", v)} opties={[["rond", "Round", vorm(22)], ["zacht", "Soft", vorm(14)], ["strak", "Sharp", vorm(6)]]} slot={slot} waarde={o.stijl.vorm} />
                <Seg label="Size" onChange={(v) => zet("grootte", v)} opties={[["compact", "Compact"], ["normaal", "Normal"], ["groot", "Large"]]} slot={slot} waarde={o.stijl.grootte} />
                <div className="v-fld">
                  <label htmlFor="ed-groet">Greeting</label>
                  <textarea id="ed-groet" maxLength={300} onChange={(e) => setO({ ...o, begroeting: e.target.value })} rows={3} value={o.begroeting} />
                </div>
              </>
            }
            onToggle={() => setOpen(open === "venster" ? "" : "venster")}
            open={open === "venster"}
            pro={slot}
            titel="Chat window"
          />

          <Groep
            kind={
              <>
                <Seg label="Side" onChange={(v) => zet("positie", v)} opties={[["links", "Bottom left"], ["rechts", "Bottom right"]]} slot={slot} waarde={o.stijl.positie} />
                <div className="v-fld">
                  <label htmlFor="ed-onder">
                    Space from bottom <b>{o.stijl.afstand}px</b>
                  </label>
                  <input disabled={slot} id="ed-onder" max={140} min={8} onChange={(e) => zet("afstand", Number(e.target.value))} type="range" value={o.stijl.afstand} />
                </div>
                <div className="v-fld">
                  <label htmlFor="ed-zij">
                    Space from side <b>{o.stijl.zij}px</b>
                  </label>
                  <input disabled={slot} id="ed-zij" max={60} min={8} onChange={(e) => zet("zij", Number(e.target.value))} type="range" value={o.stijl.zij} />
                </div>
                <p className="v-ed__hint">Tip: move AVA up if your site has a cookie bar or another button at the bottom.</p>
              </>
            }
            onToggle={() => setOpen(open === "plek" ? "" : "plek")}
            open={open === "plek"}
            pro={slot}
            titel="Position"
          />

          <Groep
            kind={
              <>
                <label className="v-toggle">
                  <span>
                    <strong>Invitation bubble</strong>
                    <small>A short message next to the button after 5 seconds.</small>
                  </span>
                  <input
                    checked={Boolean(o.stijl.uitnodiging)}
                    disabled={slot}
                    onChange={(e) => zet("uitnodiging", e.target.checked ? `Hi! 👋 Questions about prices or planning? Ask ${data.naam}.` : "")}
                    role="switch"
                    type="checkbox"
                  />
                  <i aria-hidden="true" />
                </label>
                {o.stijl.uitnodiging ? (
                  <div className="v-fld">
                    <label htmlFor="ed-uit">Invitation text</label>
                    <input disabled={slot} id="ed-uit" maxLength={90} onChange={(e) => zet("uitnodiging", e.target.value || " ")} value={o.stijl.uitnodiging} />
                  </div>
                ) : null}
                <label className="v-toggle">
                  <span>
                    <strong>Show “Volgo” in the chat</strong>
                    <small>Off: visitors only see your brand.</small>
                  </span>
                  <input checked={o.stijl.branding} disabled={slot} onChange={(e) => zet("branding", e.target.checked)} role="switch" type="checkbox" />
                  <i aria-hidden="true" />
                </label>
              </>
            }
            onToggle={() => setOpen(open === "extra" ? "" : "extra")}
            open={open === "extra"}
            pro={slot}
            titel="Invitation & branding"
          />
        </aside>

        <section aria-label="Preview" className={`v-ed__doek is-${apparaat}`}>
          <div className="v-ed__scherm">
            {apparaat === "desktop" ? (
              <div className="v-ed__browser">
                <i />
                <i />
                <i />
                <span>{toonSite ? toonSite.replace(/^https:\/\//, "") : "yourwebsite.com"}</span>
              </div>
            ) : null}
            <iframe key={`${src}-${apparaat}`} ref={frame} src={src} title="Preview of AVA on your website" />
          </div>
        </section>
      </div>
    </div>
  );
}
