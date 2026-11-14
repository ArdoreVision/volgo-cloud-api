import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { haalWebsite, stuurWebsiteAanvraag } from "@/lib/api/website.functions";

type Data = Awaited<ReturnType<typeof haalWebsite>>;

const STAPPEN: [string, string][] = [
  ["You tell us what you want", "Your business, your photos and texts, and websites you like. That is the form on this page."],
  ["We build your website", "With Volgo inside, and we arrange your domain name. We contact you when there is something to look at."],
  ["You review and approve", "Tell us what to change. Nothing goes live before you say yes."],
  ["Your website goes live", "With Volgo on it from the first minute. You see it under My website."],
];

/**
 * Website (Complete): the customer does not build anything. They tell us what they want, we build the website
 * with Volgo inside and arrange the domain. This page is the briefing and shows where the request stands.
 */
export function WebsiteAanvraag({ openTab }: { openTab: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [opnieuw, setOpnieuw] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const laad = () => void haalWebsite().then(setD).catch(() => setFout("Loading did not work. Refresh the page."));
  useEffect(laad, []);
  if (!d) return <p className="v-g__leeg">{fout || "Loading…"}</p>;

  async function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const wensen = String(fd.get("wensen") ?? "").trim();
    if (wensen.length < 10) return setFout("Tell us in a few sentences what you want on your website.");
    setBezig(true);
    setFout("");
    const r = await stuurWebsiteAanvraag({
      data: {
        contact: fd.get("contact") === "call" ? "call" : "chat",
        telefoon: String(fd.get("telefoon") ?? ""),
        domein: String(fd.get("domein") ?? ""),
        huidige_site: String(fd.get("huidige_site") ?? ""),
        wensen,
      },
    }).catch(() => ({ ok: false as const, message: "Sending did not work. Please try again." }));
    setBezig(false);
    if (!r.ok) return setFout(r.message);
    setOpnieuw(false);
    laad();
  }

  const a = d.aanvraag;
  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Website</h1>
        <p>We build your complete website, with Volgo inside and your domain included. You only tell us what you want.</p>
      </header>

      <section className="v-g__kaart">
        <h2>How it goes</h2>
        <ol className="v-wa__stappen">
          {STAPPEN.map(([titel, tekst], i) => (
            <li className={a && i === 0 ? "is-klaar" : ""} key={titel}>
              <span aria-hidden="true" className={`v-inst__nr${a && i === 0 ? " is-klaar" : ""}`}>
                {a && i === 0 ? "✓" : i + 1}
              </span>
              <div>
                <strong>{titel}</strong>
                <small>{tekst}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {a && !opnieuw ? (
        <section className="v-g__kaart">
          <div className="v-mw__kop">
            <h2 style={{ margin: 0 }}>Your request is with us</h2>
            <span className="v-g__status is-aan">Received</span>
          </div>
          <p>We read it and contact you {a.contact === "call" ? "to plan a call" : "by email"}. Something to add or change? Send it again and we use the newest one.</p>
          <dl className="v-wa__lijst">
            {a.domein ? (
              <div>
                <dt>Domain name you want</dt>
                <dd>{a.domein}</dd>
              </div>
            ) : null}
            {a.huidige_site ? (
              <div>
                <dt>Your current website</dt>
                <dd>{a.huidige_site}</dd>
              </div>
            ) : null}
            <div>
              <dt>What you want</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{a.wensen}</dd>
            </div>
          </dl>
          <div className="v-g__knoppen" style={{ marginTop: 14 }}>
            <button className="v-g__knop2" onClick={() => setOpnieuw(true)} type="button">
              Change my request
            </button>
            <button className="v-g__knop2" onClick={() => openTab("ava")} type="button">
              Set up your chat meanwhile
            </button>
          </div>
        </section>
      ) : (
        <section className="v-g__kaart">
          <h2>Tell us what you want</h2>
          <p>A few sentences are enough. We ask the rest.</p>
          <form className="v-g__form v-wa__form" onSubmit={(e) => void verstuur(e)}>
            <label className="v-g__veld is-breed">
              What does your business do, and what should be on the website?
              <textarea defaultValue={a?.wensen ?? ""} name="wensen" placeholder="For example: car detailing in Vlissingen. Pages: services, prices on request, photos of my work, reviews, contact. Style: dark and modern." required rows={6} />
            </label>
            <label className="v-g__veld">
              Domain name you want
              <input defaultValue={a?.domein ?? ""} name="domein" placeholder="yourbusiness.com" />
              <small>Already have one? Fill it in. Otherwise we check what is free.</small>
            </label>
            <label className="v-g__veld">
              Your current website or Instagram
              <input defaultValue={a?.huidige_site ?? ""} name="huidige_site" placeholder="instagram.com/yourbusiness" />
              <small>So we can use your photos and reviews.</small>
            </label>
            <label className="v-g__veld">
              How do you want us to contact you?
              <select defaultValue={a?.contact ?? "chat"} name="contact">
                <option value="chat">By email</option>
                <option value="call">In a call</option>
              </select>
            </label>
            <label className="v-g__veld">
              Phone number
              <input autoComplete="tel" defaultValue={a?.telefoon ?? ""} inputMode="tel" name="telefoon" placeholder="06 12345678" />
            </label>
            <div className="v-g__knoppen is-breed">
              <button className="v-g__knop" disabled={bezig} type="submit">
                {bezig ? "Sending…" : "Send to Volgo"}
              </button>
              {opnieuw ? (
                <button className="v-g__knop2" onClick={() => setOpnieuw(false)} type="button">
                  Cancel
                </button>
              ) : null}
              {fout ? <span className="v-g__fout">{fout}</span> : null}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
