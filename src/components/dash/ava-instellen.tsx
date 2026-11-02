import { useEffect, useState } from "react";

import { AgendaInstellingen } from "./agenda-instellingen";
import type { FormEvent } from "react";

import { bewaarAva, bewaarMeldingen, bewaarToestemming, haalAva } from "@/lib/api/ava.functions";
import { markeerOnboarding } from "@/lib/api/assistent.functions";

import { InstallGuides } from "@/components/volgo/install-guides";

import { AvaStijl } from "./ava-stijl";

type Ava = Awaited<ReturnType<typeof haalAva>>;
const KLEUREN = ["#1677d9", "#111318", "#1f9d55", "#6d4fd8", "#e07a10", "#d63c7b"];

function Toggle({ aan, onChange, label, uitleg }: { aan: boolean; onChange: (v: boolean) => void; label: string; uitleg: string }) {
  return (
    <label className="v-toggle">
      <span>
        <strong>{label}</strong>
        <small>{uitleg}</small>
      </span>
      <input checked={aan} onChange={(e) => onChange(e.target.checked)} role="switch" type="checkbox" />
      <i aria-hidden="true" />
    </label>
  );
}

export type AvaDeel = "praten" | "stijl" | "installeren" | "meldingen";

export function AvaInstellen({ deel }: { deel: AvaDeel }) {
  const [ava, setAva] = useState<Ava | null>(null);
  const [kleur, setKleur] = useState("#1677d9");
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);
  const [melding, setMelding] = useState({ chat: true, lead: true, email: false, heet_mail: true, samenvatting: true, chat_mail: true });
  const [browser, setBrowser] = useState<string>("default");
  const [toestemmingAan, setToestemmingAan] = useState(true);

  useEffect(() => {
    void haalAva().then((a) => {
      setAva(a);
      setKleur(a.inst.kleur);
      setToestemmingAan(Boolean(a.inst.toestemming));
      setMelding({ chat: !!a.meldingen.chat, lead: !!a.meldingen.lead, email: !!a.meldingen.email, heet_mail: !!a.meldingen.heet_mail, samenvatting: !!a.meldingen.samenvatting, chat_mail: !!a.meldingen.chat_mail });
    });
    if (typeof Notification !== "undefined") setBrowser(Notification.permission);
  }, []);

  async function wijzigMelding(k: keyof typeof melding, v: boolean) {
    const nieuw = { ...melding, [k]: v };
    setMelding(nieuw);
    await bewaarMeldingen({ data: nieuw });
    if (v && (k === "chat" || k === "lead") && typeof Notification !== "undefined" && Notification.permission === "default") {
      setBrowser(await Notification.requestPermission());
    }
  }

  async function opslaan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await bewaarAva({
      data: {
        naam: String(fd.get("naam") ?? "AVA").trim() || "AVA",
        begroeting: String(fd.get("begroeting") ?? "").trim(),
        bedrijfsinfo: String(fd.get("bedrijfsinfo") ?? "").trim(),
        kleur,
      },
    });
    setOpgeslagen(true);
    window.setTimeout(() => setOpgeslagen(false), 2500);
  }

  if (!ava) return <p className="v-feed__empty">Loading AVA…</p>;
  const host = typeof window !== "undefined" ? window.location.origin : "";
  const code = `<script src="${host}/ava.js" data-key="${ava.inst.sleutel}" defer></script>`;

  if (deel === "meldingen") return (
    <>
        <section className="v-dash__panel">
          <div className="v-dash__panel-head">
            <h2>Notifications</h2>
          </div>
          <p className="v-muted v-small" style={{ marginBottom: 14 }}>In the dashboard you always see what happens live. Choose what also reaches you by email, so you never miss a customer when you are not logged in.</p>
          <h3 className="v-sub">In the dashboard</h3>
          <div className="v-toggles">
            <Toggle aan={melding.chat} label="New conversation" onChange={(v) => void wijzigMelding("chat", v)} uitleg="A pop-up (and a browser notification) as soon as someone talks to AVA." />
            <Toggle aan={melding.lead} label="New lead" onChange={(v) => void wijzigMelding("lead", v)} uitleg="When a visitor leaves their details, with a warmth score." />
          </div>
          <h3 className="v-sub" style={{ marginTop: 22 }}>By email</h3>
          <div className="v-toggles">
            <Toggle aan={melding.chat_mail} label="Every new conversation" onChange={(v) => void wijzigMelding("chat_mail", v)} uitleg="An email the moment a visitor starts chatting, with their first message. Max 30 per hour." />
            <Toggle aan={melding.heet_mail} label="Hot leads" onChange={(v) => void wijzigMelding("heet_mail", v)} uitleg="An instant email when someone with warmth 75 or higher leaves their details." />
            <Toggle aan={melding.email} label="Every lead" onChange={(v) => void wijzigMelding("email", v)} uitleg="Also an email for less warm leads." />
            <Toggle aan={melding.samenvatting} label="Morning summary" onChange={(v) => void wijzigMelding("samenvatting", v)} uitleg="A short email every morning at 7:00: new leads, who to call and your appointments." />
          </div>
          {browser === "denied" ? <p className="v-muted v-small">Your browser blocks notifications. You will still see them in the dashboard.</p> : null}
        </section>
    </>
  );
  if (deel === "installeren") return (
    <>
        <section className="v-dash__panel">
          <h2 className="v-sub">Visitor data and consent</h2>
          <Toggle
            aan={toestemmingAan}
            label="Ask visitors for permission first"
            onChange={(v) => {
              setToestemmingAan(v);
              void bewaarToestemming({ data: { aan: v } });
            }}
            uitleg="Visitors see a short consent screen before using your site. Those who accept: you see their city, region, device, browser, language, returning visits and the pages they viewed before chatting. Those who decline (or when this is off) are only counted anonymously."
          />
        </section>
        <section className="v-dash__panel">
          <div className="v-dash__panel-head">
            <h2>On your website</h2>
          </div>
          <p className="v-muted v-small">Paste this one line just before &lt;/body&gt; on your website, or send it to whoever manages your site. Prefer we do it? Email volgo.app@outlook.com.</p>
          <div className="v-copy">
            <input aria-label="Install code" readOnly value={code} />
            <button
              onClick={() => {
                navigator.clipboard.writeText(code).then(() => setGekopieerd(true), () => setGekopieerd(false));
                void markeerOnboarding({ data: { actie: "geinstalleerd" } });
              }}
              type="button"
            >
              {gekopieerd ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="v-muted v-small" style={{ marginTop: 14 }}>
            Where to paste it, step by step:
          </p>
          <InstallGuides />
        </section>
    </>
  );
  if (deel === "stijl") return (
    <>
      <AvaStijl begin={ava.stijl} kleur={kleur} mag={ava.magStijl} naam={ava.inst.naam} />
    </>
  );
  return (
    <>
      <p className="v-instel__intro">
        {ava.aiActief ? "AVA has real conversations using AI." : "AVA is running in basic mode: a short, fixed intake."}{" "}
        <a href={`/demo/${ava.inst.sleutel}`} rel="noopener" target="_blank">
          Try AVA on a sample site ↗
        </a>
      </p>
      <section className="v-dash__panel">
        <div className="v-dash__panel-head">
          <h2>How AVA talks</h2>
        </div>
        <form className="v-ava-form" onSubmit={(e) => void opslaan(e)}>
          <div className="v-row">
            <div className="v-fld">
              <label htmlFor="ava-naam">Assistant name</label>
              <input defaultValue={ava.inst.naam} id="ava-naam" maxLength={30} name="naam" />
            </div>
            <div className="v-fld">
              <span className="v-fld__label">Color</span>
              <div className="v-swatches" role="radiogroup" aria-label="Color">
                {KLEUREN.map((k) => (
                  <button aria-checked={kleur === k} aria-label={k} className="v-swatch" key={k} onClick={() => setKleur(k)} role="radio" style={{ background: k }} type="button" />
                ))}
              </div>
            </div>
          </div>
          <div className="v-fld">
            <label htmlFor="ava-begroeting">First message</label>
            <input defaultValue={ava.inst.begroeting} id="ava-begroeting" maxLength={300} name="begroeting" />
          </div>
          <div className="v-fld">
            <label htmlFor="ava-info">What AVA should know about your business</label>
            <textarea
              defaultValue={ava.inst.bedrijfsinfo}
              id="ava-info"
              maxLength={4000}
              name="bedrijfsinfo"
              placeholder="E.g. services, service area, opening hours, how fast you call back, what you don't do."
              rows={6}
            />
          </div>
          <div className="v-modal__actions">
            {opgeslagen ? <span className="v-auth__ok">Saved</span> : null}
            <button className="v-btn-dark" type="submit">
              Save
            </button>
          </div>
        </form>
      </section>
      <AgendaInstellingen inst={ava.inst} />
    </>
  );
}
