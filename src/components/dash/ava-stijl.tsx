import { useRef, useState } from "react";

import { bewaarStijl } from "@/lib/api/ava.functions";

import { Upsell } from "./upsell";

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

function Keuze<T extends string>({ label, waarde, opties, onChange }: { label: string; waarde: T; opties: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="v-fld">
      <span className="v-fld__label">{label}</span>
      <div className="v-seg" role="radiogroup" aria-label={label}>
        {opties.map(([v, l]) => (
          <button aria-checked={waarde === v} aria-selected={waarde === v} key={v} onClick={() => onChange(v)} role="radio" type="button">
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AvaStijl({ begin, mag, naam, kleur }: { begin: Stijl; mag: boolean; naam: string; kleur: string }) {
  const [s, setS] = useState<Stijl>(begin);
  const [status, setStatus] = useState<"" | "bezig" | "ok" | "fout">("");
  const [melding, setMelding] = useState("");
  const bestand = useRef<HTMLInputElement>(null);
  const zet = <K extends keyof Stijl>(k: K, v: Stijl[K]) => setS((x) => ({ ...x, [k]: v }));

  if (!mag) {
    return (
      <Upsell
        knop="Upgrade to Pro"
        punten={["Your own photo for Volgo", "Light or dark, round or sharp, left or right", "Uses your website's font", "No Volgo branding"]}
        tag="Pro and Premium"
        tekst="Make the chat look like part of your own website, so visitors only see your brand."
        titel="Your own Volgo style"
      />
    );
  }

  async function opslaan() {
    setStatus("bezig");
    const r = await bewaarStijl({ data: s }).catch(() => ({ ok: false as const, message: "Couldn't save. Is the photo very large? Try another one." }));
    setStatus(r.ok ? "ok" : "fout");
    setMelding(r.ok ? "Saved. Your website shows the new style on the next page load." : r.message);
  }

  const foto = s.avatar ?? "/assets/volgo/ava-mono.svg";
  return (
    <section className="v-dash__panel">
      <div className="v-dash__panel-head">
        <h2>Style</h2>
      </div>
      <div className="v-stijl">
        <div className="v-stijl__velden">
          <div className="v-fld">
            <span className="v-fld__label">Profile photo</span>
            <div className="v-stijl__foto">
              <img alt="" src={foto} />
              <button className="v-dash__logout" onClick={() => bestand.current?.click()} type="button">
                Upload photo
              </button>
              {s.avatar ? (
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
          <div className="v-fld">
            <label htmlFor="stijl-knop">Button text</label>
            <input id="stijl-knop" maxLength={30} onChange={(e) => zet("knoptekst", e.target.value)} placeholder={`Ask ${naam}`} value={s.knoptekst} />
          </div>
          <Keuze label="Theme" onChange={(v) => zet("thema", v)} opties={[["licht", "Light"], ["donker", "Dark"], ["auto", "Auto"]]} waarde={s.thema} />
          <Keuze label="Shape" onChange={(v) => zet("vorm", v)} opties={[["rond", "Round"], ["zacht", "Soft"], ["strak", "Sharp"]]} waarde={s.vorm} />
          <Keuze label="Position" onChange={(v) => zet("positie", v)} opties={[["rechts", "Bottom right"], ["links", "Bottom left"]]} waarde={s.positie} />
          <Keuze label="Font" onChange={(v) => zet("lettertype", v)} opties={[["website", "My website's font"], ["systeem", "Standard"]]} waarde={s.lettertype} />
          <label className="v-toggle">
            <span>
              <strong>Show “Volgo” in the chat</strong>
              <small>Off: visitors only see your brand.</small>
            </span>
            <input checked={s.branding} onChange={(e) => zet("branding", e.target.checked)} role="switch" type="checkbox" />
            <i aria-hidden="true" />
          </label>
          <div className="v-form-actie">
            <button className="v-btn-blauw" disabled={status === "bezig"} onClick={() => void opslaan()} type="button">
              {status === "bezig" ? "Saving…" : "Save style"}
            </button>
            {melding ? <span className={status === "ok" ? "v-ok-tekst" : "v-err"}>{melding}</span> : null}
          </div>
        </div>

        <div aria-label="Preview" className={`v-stijl__voorbeeld${s.positie === "links" ? " is-links" : ""}`}>
          <div className={`v-wv v-wv--${s.thema} v-wv--${s.vorm}`} style={{ ["--c" as string]: kleur }}>
            <div className="v-wv__kop">
              <img alt="" src={foto} />
              <div>
                <strong>{naam}</strong>
                <small>Replies instantly</small>
              </div>
            </div>
            <p className="v-wv__b v-wv__b--a">Hi! How can I help?</p>
            <p className="v-wv__b v-wv__b--u">Can you send me a quote?</p>
            <p className="v-wv__noot">AI assistant{s.branding ? " · Volgo" : ""}</p>
          </div>
          <div className={`v-wv-knop v-wv--${s.thema} v-wv--${s.vorm}`}>
            <img alt="" src={foto} />
            <span>{s.knoptekst || `Ask ${naam}`}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
