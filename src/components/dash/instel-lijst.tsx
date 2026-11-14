import { useEffect, useState } from "react";

import { haalInstelStatus } from "@/lib/api/groei.functions";

import { vraagVolgo } from "./vraag-volgo";

type Data = Awaited<ReturnType<typeof haalInstelStatus>>;
type Punt = { id: string; titel: string; uitleg: string; klaar: boolean; status: string; knop: string; doel: string; nodig?: boolean };

/**
 * Set up Volgo: every setting a business has to check once, with its real status and a button to the right place.
 * Shown on the Install page and, until everything needed is done, on Today.
 */
export function InstelLijst({ openTab, kort = false, metWebsite = false }: { openTab: (t: string) => void; kort?: boolean; metWebsite?: boolean }) {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    void haalInstelStatus().then(setD).catch(() => undefined);
  }, []);
  if (!d) return null;
  const autoAan = Object.values(d.opvolging).filter(Boolean).length;
  const punten: Punt[] = [
    metWebsite
      ? { id: "web", titel: "Tell us what you want on your website", uitleg: "We build it with Volgo inside. Nothing to install.", klaar: d.geinstalleerd, status: d.geinstalleerd ? "Live" : "To do", knop: "Open Website", doel: "website", nodig: true }
      : { id: "web", titel: "Put Volgo on your website", uitleg: "One line, step by step. Volgo checks it by itself.", klaar: d.geinstalleerd, status: d.geinstalleerd ? "Live" : "To do", knop: "Install", doel: "installeren", nodig: true },
    { id: "uren", titel: "Opening hours and appointment length", uitleg: "When visitors can book, and what kinds of appointment.", klaar: d.boeken, status: d.boeken ? "On" : "Booking is off", knop: "Open settings", doel: "agenda-instellen", nodig: true },
    { id: "agenda", titel: "Link your own calendar", uitleg: "Google, Outlook or Apple. Busy times there are never offered to visitors.", klaar: d.agenda, status: d.agenda ? "Linked" : "Not linked", knop: "Link calendar", doel: "agenda-instellen", nodig: true },
    { id: "mail", titel: "Email notifications", uitleg: "An email for every new conversation and hot request, and a morning summary.", klaar: d.mail, status: d.mail ? "On" : "Off", knop: "Open notifications", doel: "meldingen", nodig: true },
    { id: "push", titel: "Notifications on your phone", uitleg: "A push message the moment someone chats or books. Switch it on once per device.", klaar: d.push, status: d.push ? "On" : "Not on yet", knop: "Switch on", doel: "meldingen" },
    { id: "auto", titel: "Automatic messages to your customers", uitleg: `Confirmation, reminder, follow-up and review request. Read them first. Language: ${d.taal === "nl" ? "Dutch" : "English"}.`, klaar: autoAan > 0, status: `${autoAan} of 4 on`, knop: "Open Follow-up", doel: "automatisch" },
    { id: "review", titel: "Google review link", uitleg: "So Volgo can ask every customer for a review after the appointment.", klaar: d.review, status: d.review ? "Set" : "Not set", knop: "Add link", doel: "kanalen" },
    { id: "nummer", titel: "Your business number", uitleg: "For the WhatsApp and call buttons in your chat.", klaar: d.nummer, status: d.nummer ? "Set" : "Not set", knop: "Open Connections", doel: "kanalen" },
    { id: "test", titel: "Try it yourself", uitleg: "Chat with Volgo on your own website and book a test appointment.", klaar: d.getest, status: d.getest ? "Done" : "Not yet", knop: "Open My website", doel: "mijnsite" },
  ];
  const klaar = punten.filter((p) => p.klaar).length;
  const nodigOpen = punten.filter((p) => p.nodig && !p.klaar).length;
  if (kort && nodigOpen === 0) return null;

  return (
    <section className="v-g__kaart v-il">
      <div className="v-mw__kop">
        <div>
          <h2 style={{ margin: 0 }}>Set up Volgo</h2>
          <span className={`v-g__status${klaar === punten.length ? " is-aan" : " is-let"}`}>
            {klaar} of {punten.length} done
          </span>
        </div>
        <button className="v-g__knop2" onClick={() => vraagVolgo("Help me set up Volgo. What should I still do?")} type="button">
          Ask Volgo to help
        </button>
      </div>
      <div aria-hidden="true" className="v-wiz__balk" style={{ margin: "12px 0 4px" }}>
        <i style={{ width: `${(klaar / punten.length) * 100}%` }} />
      </div>
      <ul className="v-il__lijst">
        {(kort ? punten.filter((p) => !p.klaar) : punten).map((p) => (
          <li className={p.klaar ? "is-klaar" : ""} key={p.id}>
            <span aria-hidden="true" className={`v-inst__nr${p.klaar ? " is-klaar" : ""}`}>
              {p.klaar ? "✓" : "!"}
            </span>
            <div>
              <strong>
                {p.titel}
                {p.nodig && !p.klaar ? <em>Needed</em> : null}
              </strong>
              <small>{p.uitleg}</small>
            </div>
            <span className={`v-g__status${p.klaar ? " is-aan" : ""}`}>{p.status}</span>
            <button className={p.klaar ? "v-g__knop2" : "v-g__knop"} onClick={() => openTab(p.doel)} type="button">
              {p.klaar ? "Change" : p.knop}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
