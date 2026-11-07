import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { bewaarMijnChat, haalMijnChat } from "@/lib/api/ava.functions";

type Data = Awaited<ReturnType<typeof haalMijnChat>>;

const KLEUREN = ["#111111", "#1f6feb", "#0f9d58", "#2f855a", "#b7791f", "#c53030", "#6b46c1", "#0b7285"];
const VOORBEELD_VRAGEN = ["What do you need help with?", "What is your address?", "When should it be finished?", "Do you have a budget in mind?", "Can you send a photo?"];

/** Shrinks a photo to a small square so it loads fast in the chat. */
function verklein(bestand: File): Promise<string> {
  return new Promise((ok, fout) => {
    const img = new Image();
    const url = URL.createObjectURL(bestand);
    img.onload = () => {
      const maat = 160;
      const c = document.createElement("canvas");
      c.width = maat;
      c.height = maat;
      const ctx = c.getContext("2d");
      if (!ctx) return fout(new Error("canvas"));
      const z = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - z) / 2, (img.height - z) / 2, z, z, 0, 0, maat, maat);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => fout(new Error("image"));
    img.src = url;
  });
}

/** "Your chat": the only settings a customer changes. Name, photo, colour, light or dark, greeting and the questions. */
export function MijnChat({ klaar }: { klaar?: (wat: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [status, setStatus] = useState<"" | "bezig" | "ok" | "fout">("");
  const bestand = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void haalMijnChat().then(setD);
  }, []);
  if (!d) return <p className="v-mc__laden">Loading your chat…</p>;

  const zet = <K extends keyof Data>(k: K, v: Data[K]) => {
    setD({ ...d, [k]: v });
    setStatus("");
  };
  async function foto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      zet("avatar", await verklein(f));
    } catch {
      setStatus("fout");
    }
  }
  async function opslaan() {
    if (!d) return;
    setStatus("bezig");
    try {
      await bewaarMijnChat({ data: { naam: d.naam, begroeting: d.begroeting, kleur: d.kleur, vragen: d.vragen, avatar: d.avatar, thema: d.thema } });
      setStatus("ok");
      klaar?.("chat");
    } catch {
      setStatus("fout");
    }
  }
  const vragen = d.vragen.split("\n").filter((v) => v.trim());
  const donker = d.thema === "donker";

  return (
    <div className="v-mc">
      <header className="v-mc__kop">
        <h1>Your chat</h1>
        <p>This is how your assistant looks on your website. Change it whenever you like.</p>
      </header>

      <div className="v-mc__raster">
        <div className="v-mc__velden">
          <div className="v-mc__veld">
            <span className="v-mc__label">Photo</span>
            <div className="v-mc__foto">
              <span className="v-mc__av" style={{ background: d.kleur }}>
                {d.avatar ? <img alt="" src={d.avatar} /> : d.naam.slice(0, 1).toUpperCase()}
              </span>
              <button className="v-mc__knop2" onClick={() => bestand.current?.click()} type="button">
                {d.avatar ? "Change photo" : "Add photo"}
              </button>
              {d.avatar ? (
                <button className="v-mc__link" onClick={() => zet("avatar", null)} type="button">
                  Remove
                </button>
              ) : null}
              <input accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void foto(e)} ref={bestand} type="file" />
            </div>
          </div>

          <label className="v-mc__veld">
            <span className="v-mc__label">Name</span>
            <input maxLength={30} onChange={(e) => zet("naam", e.target.value)} value={d.naam} />
          </label>

          <label className="v-mc__veld">
            <span className="v-mc__label">First message</span>
            <textarea maxLength={300} onChange={(e) => zet("begroeting", e.target.value)} rows={2} value={d.begroeting} />
          </label>

          <div className="v-mc__veld">
            <span className="v-mc__label">Colour</span>
            <div className="v-mc__kleuren">
              {KLEUREN.map((k) => (
                <button aria-label={k} aria-pressed={d.kleur.toLowerCase() === k} className="v-mc__kleur" key={k} onClick={() => zet("kleur", k)} style={{ background: k }} type="button" />
              ))}
              <label className="v-mc__kleur v-mc__kleur--eigen" title="Your own colour">
                <input onChange={(e) => zet("kleur", e.target.value)} type="color" value={d.kleur} />
              </label>
            </div>
          </div>

          <div className="v-mc__veld">
            <span className="v-mc__label">Style</span>
            <div className="v-mc__seg" role="radiogroup">
              {(
                [
                  ["licht", "Light"],
                  ["donker", "Dark"],
                  ["auto", "Automatic"],
                ] as const
              ).map(([id, t]) => (
                <button aria-checked={d.thema === id} key={id} onClick={() => zet("thema", id)} role="radio" type="button">
                  {t}
                </button>
              ))}
            </div>
          </div>

          <label className="v-mc__veld">
            <span className="v-mc__label">What do you want to know from every customer?</span>
            <small className="v-mc__hulp">One question per line. Your assistant asks them before the appointment.</small>
            <textarea onChange={(e) => zet("vragen", e.target.value)} placeholder={VOORBEELD_VRAGEN.slice(0, 3).join("\n")} rows={5} value={d.vragen} />
          </label>
          <div className="v-mc__chips">
            {VOORBEELD_VRAGEN.filter((v) => !vragen.includes(v)).map((v) => (
              <button key={v} onClick={() => zet("vragen", [...vragen, v].join("\n"))} type="button">
                + {v}
              </button>
            ))}
          </div>

          <div className="v-mc__opslaan">
            <button className="v-mc__knop" disabled={status === "bezig"} onClick={() => void opslaan()} type="button">
              {status === "bezig" ? "Saving…" : "Save"}
            </button>
            {status === "ok" ? <span className="v-mc__ok">Saved. Live on your website.</span> : null}
            {status === "fout" ? <span className="v-mc__fout">That didn't work. Check the fields and try again.</span> : null}
          </div>
        </div>

        <aside aria-label="Preview" className={`v-mc__voorbeeld${donker ? " is-donker" : ""}`}>
          <div className="v-mc__venster">
            <div className="v-mc__balk" style={{ background: d.kleur }}>
              <span className="v-mc__av v-mc__av--klein">{d.avatar ? <img alt="" src={d.avatar} /> : d.naam.slice(0, 1).toUpperCase()}</span>
              <span>
                <b>{d.naam || "Assistant"}</b>
                <small>Online · replies instantly</small>
              </span>
            </div>
            <div className="v-mc__berichten">
              <p className="v-mc__bel v-mc__bel--ava">{d.begroeting}</p>
              <p className="v-mc__bel v-mc__bel--klant" style={{ background: d.kleur }}>
                Hi, I'd like a quote.
              </p>
              <p className="v-mc__bel v-mc__bel--ava">{vragen[0] ?? "Sure! What do you need help with?"}</p>
            </div>
          </div>
          <span className="v-mc__bol" style={{ background: d.kleur }}>
            {d.avatar ? <img alt="" src={d.avatar} /> : null}
          </span>
        </aside>
      </div>
    </div>
  );
}
