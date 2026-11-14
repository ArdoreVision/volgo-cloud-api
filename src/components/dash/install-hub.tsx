import { useEffect, useState } from "react";

import { haalInstelStatus, zetSnel } from "@/lib/api/groei.functions";
import { haalBouwer, publiceerSite } from "@/lib/api/website.functions";

import { vraagVolgo } from "./vraag-volgo";

type Status = Awaited<ReturnType<typeof haalInstelStatus>>;
type Site = Awaited<ReturnType<typeof haalBouwer>>;
type Rij = { id: string; titel: string; uitleg: string; klaar: boolean; status: string; knop?: string; doe?: () => void | Promise<void>; stil?: boolean };

const ALLES_AAN = { booking_on: true, reminder_on: true, follow_up_on: true, review_request_on: true, email_every_request: true, email_hot_requests: true, email_morning_summary: true, email_every_conversation: true } as const;

/**
 * Install: everything that has to be switched on before Volgo works, in one place. Each line shows its real status
 * and has one button. What is a plain switch goes on with one tap; what needs something from the owner (a domain,
 * a calendar, a review link) opens the right page.
 */
export function InstallHub({ openTab, metWebsite }: { openTab: (t: string) => void; metWebsite: boolean }) {
  const [s, setS] = useState<Status | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [bezig, setBezig] = useState("");
  const [fout, setFout] = useState("");

  const laad = async () => {
    const [a, b] = await Promise.all([haalInstelStatus(), metWebsite ? haalBouwer() : Promise.resolve(null)]);
    setS(a);
    setSite(b);
  };
  useEffect(() => {
    void laad().catch(() => setFout("Loading did not work. Refresh the page."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s) return <p className="v-muted">{fout || "Loading…"}</p>;

  async function zet(id: string, changes: Record<string, boolean>) {
    setBezig(id);
    setFout("");
    const r = await zetSnel({ data: { changes } }).catch(() => ({ ok: false, geweigerd: ["That did not work. Try again."] }));
    if (!r.ok) setFout(r.geweigerd[0] ?? "That did not work.");
    await laad().catch(() => undefined);
    window.dispatchEvent(new Event("volgo-instellingen-gewijzigd"));
    setBezig("");
  }
  async function online() {
    setBezig("site");
    const r = await publiceerSite({ data: { aan: true } }).catch(() => ({ ok: false }));
    if (!r.ok) setFout("Putting your website online did not work. Open Website and try there.");
    await laad().catch(() => undefined);
    setBezig("");
  }

  const auto = [s.opvolging.herinnering, s.opvolging.opvolging, s.opvolging.review].filter(Boolean).length;
  const eig = s.eigenaar;

  const website: Rij[] = metWebsite
    ? [
        !site?.heeftSite
          ? { id: "site", titel: "Your website", uitleg: "Volgo builds it from your business details. You choose the theme.", klaar: false, status: "Not built yet", knop: "Build my website", doe: () => openTab("website") }
          : site.gepubliceerd
            ? { id: "site", titel: "Your website", uitleg: "Online. Change it any time by typing what you want.", klaar: true, status: "Online", knop: "Open", doe: () => openTab("website"), stil: true }
            : { id: "site", titel: "Your website", uitleg: "Built and waiting. One tap puts it online.", klaar: false, status: "Draft", knop: eig ? "Put online" : "Open", doe: eig ? online : () => openTab("website") },
        {
          id: "chat",
          titel: "Volgo chat on your website",
          uitleg: "Already inside the website Volgo builds. Nothing to install.",
          klaar: Boolean(site?.heeftSite),
          status: site?.gepubliceerd ? "Live" : site?.heeftSite ? "Ready" : "Comes with your website",
          knop: "Change its look",
          doe: () => openTab("ava"),
          stil: true,
        },
        site?.domein
          ? { id: "domein", titel: "Your own domain", uitleg: site.domeinStatus === "actief" ? `www.${site.domein} shows your website.` : `Point www.${site.domein} at Volgo with one record. The Website page shows which.`, klaar: site.domeinStatus === "actief", status: site.domeinStatus === "actief" ? "Connected" : "Waiting for your domain", knop: "Open", doe: () => openTab("website"), stil: site.domeinStatus === "actief" }
          : { id: "domein", titel: "Your own domain", uitleg: "Optional. Until then your website has a Volgo address.", klaar: false, status: "Not connected", knop: "Connect domain", doe: () => openTab("website") },
      ]
    : [{ id: "site", titel: "Volgo on your website", uitleg: "One line in your website, step by step.", klaar: s.geinstalleerd, status: s.geinstalleerd ? "Live" : "To do", knop: s.geinstalleerd ? "Open" : "Install", doe: () => openTab("inbouwen"), stil: s.geinstalleerd }];

  const boeken: Rij[] = [
    { id: "boeken", titel: "Booking in the chat", uitleg: "Visitors pick a free time themselves.", klaar: s.boeken, status: s.boeken ? "On" : "Off", knop: s.boeken ? "Hours" : "Switch on", doe: s.boeken ? () => openTab("agenda-instellen") : () => zet("boeken", { booking_on: true }), stil: s.boeken },
    { id: "auto", titel: "Automatic messages", uitleg: "Reminder the day before, follow-up after 1 and 3 days, review request.", klaar: auto === 3, status: `${auto} of 3 on`, knop: auto === 3 ? "Read them" : eig ? "Switch all on" : "Open", doe: auto === 3 || !eig ? () => openTab("automatisch") : () => zet("auto", { reminder_on: true, follow_up_on: true, review_request_on: true }), stil: auto === 3 },
    { id: "agenda", titel: "Your own calendar", uitleg: "Google, Outlook or Apple. Busy times there are never offered.", klaar: s.agenda, status: s.agenda ? "Linked" : "Not linked", knop: s.agenda ? "Open" : "Link calendar", doe: () => openTab("agenda-instellen"), stil: s.agenda },
    { id: "review", titel: "Google review link", uitleg: "So Volgo can ask every customer for a review.", klaar: s.review, status: s.review ? "Set" : "Not set", knop: s.review ? "Open" : "Add link", doe: () => openTab("reviews"), stil: s.review },
    { id: "nummer", titel: "Business number", uitleg: "For the WhatsApp and call buttons in your chat.", klaar: s.nummer, status: s.nummer ? "Set" : "Not set", knop: s.nummer ? "Open" : "Add number", doe: () => openTab("kanalen"), stil: s.nummer },
  ];
  const meld: Rij[] = [
    { id: "mail", titel: "Email notifications", uitleg: "An email for new conversations and requests, and a morning summary.", klaar: s.mail, status: s.mail ? "On" : "Off", knop: s.mail ? "Choose" : "Switch on", doe: s.mail ? () => openTab("meldingen") : () => zet("mail", { email_every_request: true, email_hot_requests: true, email_morning_summary: true, email_every_conversation: true }), stil: s.mail },
    { id: "push", titel: "Notifications on this phone", uitleg: "A message the moment someone chats or books. Once per device.", klaar: s.push, status: s.push ? "On" : "Not on yet", knop: s.push ? "Open" : "Switch on", doe: () => openTab("meldingen"), stil: s.push },
  ];
  const alle = [...website, ...boeken, ...meld];
  const klaar = alle.filter((r) => r.klaar).length;
  const snelUit = !s.boeken || (eig && auto < 3) || !s.mail;

  const blok = (kop: string, rijen: Rij[]) => (
    <section className="v-g__kaart v-hub__blok">
      <h2>{kop}</h2>
      <ul className="v-hub__lijst">
        {rijen.map((r) => (
          <li className={r.klaar ? "is-klaar" : ""} key={r.id}>
            <span aria-hidden="true" className="v-hub__punt">
              {r.klaar ? "✓" : ""}
            </span>
            <div>
              <strong>{r.titel}</strong>
              <small>{r.uitleg}</small>
            </div>
            <span className={`v-g__status${r.klaar ? " is-aan" : ""}`}>{r.status}</span>
            {r.knop && r.doe ? (
              <button className={r.stil ? "v-g__knop2" : "v-g__knop"} disabled={bezig !== ""} onClick={() => void r.doe?.()} type="button">
                {bezig === r.id ? "One moment…" : r.knop}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="v-hub">
      <header className="v-dash__head v-hub__kop">
        <div>
          <h1>Install</h1>
          <p>Everything Volgo needs, in one place. Tap a button and it is on.</p>
        </div>
        <span className={`v-g__status${klaar === alle.length ? " is-aan" : " is-let"}`}>
          {klaar} of {alle.length} done
        </span>
      </header>
      <div aria-hidden="true" className="v-wiz__balk v-hub__balk">
        <i style={{ width: `${(klaar / alle.length) * 100}%` }} />
      </div>

      <div className="v-hub__snel">
        {snelUit ? (
          <button className="v-g__knop" disabled={bezig !== ""} onClick={() => void zet("alles", eig ? ALLES_AAN : { booking_on: true, email_every_request: true, email_hot_requests: true, email_morning_summary: true, email_every_conversation: true })} type="button">
            {bezig === "alles" ? "Switching on…" : "Switch everything on"}
          </button>
        ) : (
          <span className="v-hub__ok">✓ All switches are on</span>
        )}
        <button className="v-g__knop2" onClick={() => vraagVolgo("Set up Volgo for me. Switch on what you can and tell me what I still have to do myself.")} type="button">
          Let Ask Volgo do it
        </button>
      </div>
      {fout ? <p className="v-err">{fout}</p> : null}

      {blok("Website", website)}
      {blok("Chat and booking", boeken)}
      {blok("Notifications", meld)}

      <section className="v-g__kaart v-hub__blok">
        <h2>More</h2>
        <div className="v-hub__meer">
          {(
            [
              ["home", "Today", "Your day at a glance"],
              ["verkeer", "Analytics", "Results and visitors"],
              ["betalingen", "Payments", "Send a payment request"],
              ["kanalen", "Connections", "Form, WhatsApp and phone"],
              ["automatisch", "Follow-up", "Read and change the messages"],
              ["reviews", "Reviews", "Reply to a review"],
            ] as const
          ).map(([id, naam, uitleg]) => (
            <button key={id} onClick={() => openTab(id)} type="button">
              <strong>{naam}</strong>
              <small>{uitleg}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
