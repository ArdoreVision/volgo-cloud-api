import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { haalWebsite, stuurWebsiteAanvraag } from "@/lib/api/website.functions";

import { PlanCall } from "./plan-call";
import { Upsell } from "./upsell";

type Data = Awaited<ReturnType<typeof haalWebsite>>;

const STAPPEN: [string, string, string][] = [
  ["ontvangen", "Request received", "We read your wishes and contact you within 1 working day, by chat or call."],
  ["in_gesprek", "Planning together", "We agree on pages, texts, photos, video and style."],
  ["in_aanbouw", "We're building", "Your website is being built with Volgo inside."],
  ["review", "Your review", "You check everything and tell us what to change."],
  ["live", "Live", "Your website is online on your own domain, Volgo included."],
];

export function Website() {
  const [d, setD] = useState<Data | null>(null);
  const [contact, setContact] = useState<"chat" | "call">("chat");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    void haalWebsite().then(setD);
  }, []);
  if (!d) return <p className="v-muted">Loading…</p>;

  if (!d.mag) {
    return (
      <>
        <header className="v-dash__head">
          <h1>Website</h1>
          <p>On Start, Volgo runs on your own website. Add it with one line of code under Volgo → On your website.</p>
        </header>
        <Upsell
          knop="Upgrade to Volgo + Website"
          punten={[
            "A website made to measure, built by Volgo",
            "Planned with you by chat or call",
            "Photos, video and animations",
            "Volgo built in, in your own style",
          ]}
          tag="Volgo + Website"
          tekst="Let us build your website for you, with Volgo already inside. Your domain name is not included (about €10–20 a year); we help you register or connect it."
          titel="Get a custom website"
        />
      </>
    );
  }

  async function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("wensen").length < 10) return setFout("Tell us a little more about the website you want.");
    setBezig(true);
    setFout("");
    const r = await stuurWebsiteAanvraag({
      data: { contact, telefoon: v("telefoon"), domein: v("domein"), huidige_site: v("huidige_site"), wensen: v("wensen") },
    }).catch(() => ({ ok: false as const, message: "Something went wrong. Please try again." }));
    if (!r.ok) {
      setFout(r.message);
      setBezig(false);
      return;
    }
    setD(await haalWebsite());
    setBezig(false);
  }

  const a = d.aanvraag;
  const stap = a ? Math.max(0, STAPPEN.findIndex((s) => s[0] === a.status)) : -1;

  return (
    <>
      <header className="v-dash__head">
        <h1>Your website</h1>
        <p>Included in {d.plan}: we build your website to measure, with Volgo inside. Your domain name is not included.</p>
      </header>

      {a ? (
        <section className="v-dash__panel">
          <ol className="v-tijdlijn">
            {STAPPEN.map(([id, titel, uitleg], i) => (
              <li className={i < stap ? "is-klaar" : i === stap ? "is-nu" : ""} key={id}>
                <span aria-hidden="true">{i < stap ? "✓" : i + 1}</span>
                <div>
                  <strong>{titel}</strong>
                  <small>{uitleg}</small>
                </div>
              </li>
            ))}
          </ol>
          <div className="v-website__samenvatting">
            <p>
              <strong>Your request</strong> · we'll reach you by {a.contact === "call" ? "a call (send PLAN in a DM to @thevolgo.app on Instagram to pick a time)" : "chat and email"}
              {a.domein ? ` · domain: ${a.domein}` : ""}
            </p>
            <p className="v-website__wensen">{a.wensen}</p>
            <a
              className="v-dash__logout"
              href={`mailto:volgo.app@outlook.com?subject=${encodeURIComponent("My Volgo website")}&body=${encodeURIComponent(`Hi Volgo,\n\nAbout my website request:\n\n`)}`}
            >
              Message the Volgo team
            </a>
          </div>
        </section>
      ) : (
        <section className="v-dash__panel">
          <div className="v-website__intro">
            {STAPPEN.slice(0, 5).map(([id, titel], i) => (
              <span key={id}>
                <em>{i + 1}</em> {titel}
              </span>
            ))}
          </div>
          <form className="v-website__form" noValidate onSubmit={(e) => void verstuur(e)}>
            <div className="v-fld">
              <span className="v-fld__label">How would you like to plan your website?</span>
              <div className="v-seg" role="radiogroup" aria-label="Contact">
                <button aria-checked={contact === "chat"} aria-selected={contact === "chat"} onClick={() => setContact("chat")} role="radio" type="button">
                  By chat / email
                </button>
                <button aria-checked={contact === "call"} aria-selected={contact === "call"} onClick={() => setContact("call")} role="radio" type="button">
                  In a call
                </button>
              </div>
            </div>
            {contact === "call" ? <PlanCall compact /> : null}
            <div className="v-row">
              <div className="v-fld">
                <label htmlFor="w-domein">
                  Your domain <em>if you have one</em>
                </label>
                <input id="w-domein" name="domein" placeholder="yourbusiness.com" />
              </div>
              <div className="v-fld">
                <label htmlFor="w-site">
                  Current website <em>optional</em>
                </label>
                <input id="w-site" name="huidige_site" placeholder="https://…" />
              </div>
            </div>
            <div className="v-fld">
              <label htmlFor="w-wensen">What should your website do and look like?</label>
              <textarea
                id="w-wensen"
                name="wensen"
                placeholder="E.g. pages for our services, a photo gallery of our work, a short video on the homepage, calm green colors. Sites we like: …"
                rows={6}
              />
            </div>
            <p className="v-muted v-small">
              Your domain name is not included in your plan (about €10–20 a year). No domain yet? We help you register one. If you cancel your
              subscription, Volgo and the website stop at the end of your paid period.
            </p>
            {fout ? <p className="v-err">{fout}</p> : null}
            <div className="v-form-actie">
              <button className="v-btn-blauw" disabled={bezig} type="submit">
                {bezig ? "Sending…" : "Request my website"}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
