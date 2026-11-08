import { useEffect, useState } from "react";

import { haalAutomatisch } from "@/lib/api/groei.functions";

import { datumAms, sqlDate } from "./util";

type Data = Awaited<ReturnType<typeof haalAutomatisch>>;

const SOORT: Record<string, string> = { herinnering: "Reminder", review: "Review request", opvolging: "Follow-up", seizoen: "Seasonal message" };

/** What Volgo does by itself after a chat or appointment. The customer sees it; Volgo (the owner) switches it. */
export function Automatisch({ openTab }: { openTab: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    void haalAutomatisch().then(setD).catch(() => undefined);
  }, []);
  if (!d) return <p className="v-g__leeg">Loading…</p>;

  const kanaal = d.sms ? "email or text message" : "email";
  const kaarten: { id: keyof Data["aan"]; titel: string; tekst: string; let?: string }[] = [
    { id: "herinnering", titel: "Reminder the day before", tekst: `Everyone with an appointment gets a reminder by ${kanaal} about 24 hours before. Fewer people forget to show up.` },
    {
      id: "review",
      titel: "Review request after the appointment",
      tekst: "An hour after the appointment Volgo asks for a Google review, once per customer.",
      let: d.reviewUrl ? undefined : "Add your Google review link under Your website",
    },
    { id: "opvolging", titel: "Follow-up for people who didn't book", tekst: "Left their details but no appointment? Volgo follows up after 1 day and after 3 days, written for what they asked. It stops as soon as they reply or book." },
    { id: "seizoen", titel: "Seasonal message to earlier customers", tekst: "Four times a year a short, useful message to earlier customers (for a gardener: \"time to prune the hedge?\") with a button to plan a moment." },
  ];

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Automations</h1>
        <p>What Volgo does by itself, so no customer slips through. Every message can be stopped by the receiver with one click.</p>
      </header>

      <div className="v-g__raster">
        {kaarten.map((k) => {
          const aan = d.aan[k.id];
          return (
            <div className="v-g__auto" key={k.id}>
              <span className={`v-g__status${aan && !k.let ? " is-aan" : aan && k.let ? " is-let" : ""}`}>{aan ? (k.let ? "Waiting" : "On") : "Off"}</span>
              <strong>{k.titel}</strong>
              <p>{k.tekst}</p>
              {aan && k.let ? (
                <button className="v-g__knop2" onClick={() => openTab("mijnsite")} type="button">
                  {k.let}
                </button>
              ) : null}
              <span className="v-g__getal">
                <b>{d.maand[k.id] ?? 0}</b> sent in the last 30 days
              </span>
            </div>
          );
        })}
      </div>
      <p className="v-g__leeg">Want one switched on or off? Send your Volgo contact a message, we change it for you.</p>

      <section className="v-g__kaart">
        <h2>Sent by Volgo</h2>
        <p>The latest automatic messages. You also find them in the conversation in your Inbox.</p>
        {d.log.length === 0 ? <p className="v-g__leeg">Nothing sent yet. As soon as someone books or leaves their details, it shows up here.</p> : null}
        <ul className="v-g__lijst">
          {d.log.map((l) => (
            <li key={l.id}>
              <span>
                <strong>{SOORT[l.soort] ?? l.soort}</strong> to {l.aan}
                <br />
                <small>{l.onderwerp}</small>
              </span>
              <small>
                {datumAms(sqlDate(l.gemaakt))}
                <br />
                {l.status === "verstuurd" ? (l.kanaal === "sms" ? "Text ✓" : "Email ✓") : "Not delivered"}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
