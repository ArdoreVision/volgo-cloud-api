import { useEffect, useState } from "react";

import { bewaarKanalen, haalKanalen, slaKanalenOver, vraagKoppelingAan } from "@/lib/api/kanalen.functions";

type Data = Awaited<ReturnType<typeof haalKanalen>>;
type Status = Data["kanalen"][number];

const STATUS: Record<Status["status"], [string, string]> = {
  actief: ["Werkt", "is-aan"],
  uit: ["Uit", ""],
  niet_gekoppeld: ["Niet gekoppeld", ""],
  aangevraagd: ["Aangevraagd", "is-let"],
};

/**
 * Channels: where customers reach you, and what Volgo really does with each channel.
 * Shown once after the five onboarding questions, and always under "Kanalen".
 */
export function Kanalen({ onboarding, klaar, openTab }: { onboarding?: boolean; klaar?: () => void; openTab?: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [nummer, setNummer] = useState("");
  const [wa, setWa] = useState(false);
  const [bel, setBel] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);

  const laad = () =>
    void haalKanalen()
      .then((x) => {
        setD(x);
        setNummer(x.nummer);
        setWa(x.knopWhatsapp);
        setBel(x.knopBellen);
      })
      .catch(() => undefined);
  useEffect(laad, []);
  if (!d) return <p className="v-g__leeg">Laden…</p>;

  const st = (id: Status["id"]) => d.kanalen.find((k) => k.id === id)!;

  async function bewaar(verder: boolean) {
    setBezig(true);
    setMelding(null);
    const r = await bewaarKanalen({ data: { nummer, knopWhatsapp: wa, knopBellen: bel } }).catch(() => null);
    setBezig(false);
    if (!r?.ok) return setMelding({ ok: false, tekst: r?.message ?? "Opslaan lukte niet. Probeer het opnieuw." });
    setMelding({ ok: true, tekst: "Opgeslagen." });
    if (verder) klaar?.();
    else laad();
  }
  async function vraag(soort: "whatsapp" | "telefoon") {
    const r = await vraagKoppelingAan({ data: { soort } }).catch(() => null);
    if (!r?.ok) return setMelding({ ok: false, tekst: r?.message ?? "Dat lukte niet." });
    setMelding({ ok: true, tekst: "Aangevraagd. Volgo neemt contact met je op om de koppeling te regelen." });
    laad();
  }

  const Badge = ({ s }: { s: Status }) => <span className={`v-g__status ${STATUS[s.status][1]}`}>{s.id === "website" && s.status !== "actief" ? "Nog niet geïnstalleerd" : STATUS[s.status][0]}</span>;
  const Ontbreekt = ({ s }: { s: Status }) =>
    s.ontbreekt.length ? (
      <ul className="v-kn__mist">
        {s.ontbreekt.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    ) : null;

  return (
    <div className={`v-g${onboarding ? " v-kn--onboarding" : ""}`}>
      <header className="v-g__kop">
        {onboarding ? <p className="v-kn__stap">Laatste stap</p> : null}
        <h1>Kanalen</h1>
        <p>Waar klanten je bereiken: website, WhatsApp en telefoon. Hier zie je per kanaal precies wat Volgo ermee doet.</p>
      </header>

      <section className="v-g__kaart">
        <h2>Je zakelijke nummer</h2>
        <p>Het nummer waarop klanten je bellen of WhatsAppen.</p>
        <div className="v-g__form">
          <label className="v-g__veld">
            Telefoonnummer
            <input autoComplete="tel" disabled={!d.eigenaar} inputMode="tel" onChange={(e) => setNummer(e.target.value)} placeholder="06 12345678" value={nummer} />
          </label>
        </div>
      </section>

      <section className="v-g__kaart">
        <h2>Werkt meteen</h2>
        <p>Deze kun je nu aanzetten. De knoppen openen WhatsApp of de telefoon van je klant met jouw nummer. Dat gesprek gebeurt daarna in WhatsApp of aan de telefoon, niet in Volgo.</p>
        <div className="v-kn__lijst">
          <div className="v-kn__rij">
            <div>
              <strong>Website-chat</strong>
              <small>Volgo beantwoordt bezoekers, boekt afspraken en alles staat in je Inbox. Installeren kost 2 minuten.</small>
              <Ontbreekt s={st("website")} />
            </div>
            <div className="v-kn__rechts">
              <Badge s={st("website")} />
              {st("website").status !== "actief" && openTab ? (
                <button className="v-g__knop2" onClick={() => openTab("mijnsite")} type="button">
                  Installeren
                </button>
              ) : null}
            </div>
          </div>
          <label className="v-kn__rij">
            <div>
              <strong>WhatsApp-knop in je chat</strong>
              <small>Bezoekers zien in de chat een knop “WhatsApp ons”. Die opent WhatsApp met jouw nummer.</small>
            </div>
            <input checked={wa} className="v-kn__schakel" disabled={!d.eigenaar} onChange={(e) => setWa(e.target.checked)} type="checkbox" />
          </label>
          <label className="v-kn__rij">
            <div>
              <strong>Belknop in je chat</strong>
              <small>Bezoekers zien in de chat een knop “Bel ons”. Op een telefoon belt die direct jouw nummer.</small>
            </div>
            <input checked={bel} className="v-kn__schakel" disabled={!d.eigenaar} onChange={(e) => setBel(e.target.checked)} type="checkbox" />
          </label>
          <div className="v-kn__rij">
            <div>
              <strong>Terugbellen en WhatsAppen vanuit Volgo</strong>
              <small>Bij elke aanvraag met een telefoonnummer staan de knoppen Bellen en WhatsApp. Ze openen je eigen telefoon of WhatsApp.</small>
            </div>
            <span className="v-g__status is-aan">Werkt</span>
          </div>
        </div>
        {d.eigenaar ? (
          <div className="v-g__knoppen" style={{ marginTop: 14 }}>
            <button className="v-g__knop" disabled={bezig} onClick={() => void bewaar(Boolean(onboarding))} type="button">
              {bezig ? "Opslaan…" : onboarding ? "Opslaan en naar mijn dashboard" : "Opslaan"}
            </button>
            {melding ? <span className={melding.ok ? "v-g__ok" : "v-g__fout"}>{melding.tekst}</span> : null}
          </div>
        ) : (
          <p className="v-g__leeg">Alleen de eigenaar van het account kan dit aanpassen.</p>
        )}
      </section>

      <section className="v-g__kaart">
        <h2>Automatisch in je Inbox (koppeling)</h2>
        <p>
          Hiermee komen WhatsApp-berichten en gemiste oproepen zelf in je Inbox en Aanvragen, en antwoord je vanuit Volgo. Daarvoor is een koppeling met WhatsApp (Meta) of een Volgo-telefoonnummer nodig. Dit
          regelen wij met je. Het werkt pas als de status op “Werkt” staat.
        </p>
        <div className="v-kn__lijst">
          <div className="v-kn__rij">
            <div>
              <strong>WhatsApp-berichten in je Inbox</strong>
              <small>Berichten aan je WhatsApp-nummer komen in Volgo, met naam en nummer. Je antwoordt vanuit de Inbox. Meta verifieert eerst je bedrijf en nummer; dat duurt meestal een paar dagen.</small>
              <Ontbreekt s={st("whatsapp")} />
            </div>
            <div className="v-kn__rechts">
              <Badge s={st("whatsapp")} />
              {st("whatsapp").status === "niet_gekoppeld" && d.eigenaar ? (
                <button className="v-g__knop2" onClick={() => void vraag("whatsapp")} type="button">
                  Koppeling aanvragen
                </button>
              ) : null}
            </div>
          </div>
          <div className="v-kn__rij">
            <div>
              <strong>Gemiste oproepen opvangen</strong>
              <small>
                Je krijgt een Volgo-nummer dat doorschakelt naar je eigen nummer. Neem je niet op, dan staat de beller met nummer in je Inbox, krijg je een melding{d.smsTerug ? " en krijgt de beller een sms dat je terugbelt" : ""}.
                {d.volgoNummer ? ` Je Volgo-nummer: ${d.volgoNummer}.` : ""}
              </small>
              <Ontbreekt s={st("telefoon")} />
            </div>
            <div className="v-kn__rechts">
              <Badge s={st("telefoon")} />
              {st("telefoon").status === "niet_gekoppeld" && d.eigenaar ? (
                <button className="v-g__knop2" onClick={() => void vraag("telefoon")} type="button">
                  Koppeling aanvragen
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {onboarding ? (
        <button className="v-kn__later" onClick={() => void slaKanalenOver().then(() => klaar?.())} type="button">
          Later instellen
        </button>
      ) : null}
    </div>
  );
}
