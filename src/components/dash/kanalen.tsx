import { useEffect, useState } from "react";

import { bewaarMijnWebsite, haalMijnWebsite } from "@/lib/api/groei.functions";
import { bewaarKanalen, haalKanalen, slaKanalenOver, vraagKoppelingAan } from "@/lib/api/kanalen.functions";

type Data = Awaited<ReturnType<typeof haalKanalen>>;
type Site = Awaited<ReturnType<typeof haalMijnWebsite>>;
type Status = Data["kanalen"][number];

const STATUS: Record<Status["status"], [string, string]> = {
  actief: ["Live", "is-aan"],
  uit: ["Off", ""],
  niet_gekoppeld: ["Not connected", ""],
  aangevraagd: ["Requested", "is-let"],
};

/**
 * Connections: everything that can feed your inbox or that Volgo uses to reach your customers, in one list,
 * each with its real status. Shown once (in a short form) after the five onboarding questions, and always under "Connections".
 */
export function Kanalen({ onboarding, klaar, openTab }: { onboarding?: boolean; klaar?: () => void; openTab?: (t: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [nummer, setNummer] = useState("");
  const [wa, setWa] = useState(false);
  const [bel, setBel] = useState(false);
  const [review, setReview] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [reviewMelding, setReviewMelding] = useState<"" | "ok" | "fout">("");
  const [gekopieerd, setGekopieerd] = useState("");

  const laad = () =>
    void haalKanalen()
      .then((x) => {
        setD(x);
        setNummer(x.nummer);
        setWa(x.knopWhatsapp);
        setBel(x.knopBellen);
      })
      .catch(() => undefined);
  useEffect(() => {
    laad();
    void haalMijnWebsite()
      .then((x) => {
        setSite(x);
        setReview(x.reviewUrl);
      })
      .catch(() => undefined);
  }, []);
  if (!d) return <p className="v-g__leeg">Loading…</p>;

  const st = (id: Status["id"]) => d.kanalen.find((k) => k.id === id)!;
  const origin = typeof window === "undefined" ? "https://thevolgo.app" : window.location.origin;
  const kopieer = (t: string, wat: string) => void navigator.clipboard.writeText(t).then(() => setGekopieerd(wat));
  const formulier = site
    ? `<form action="${origin}/api/formulier/${site.sleutel}" method="post">
  <input name="naam" placeholder="Name" required>
  <input name="email" type="email" placeholder="Email" required>
  <input name="telefoon" placeholder="Phone">
  <textarea name="bericht" placeholder="Message" required></textarea>
  <input name="website" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">Send</button>
</form>`
    : "";

  async function bewaar(verder: boolean) {
    setBezig(true);
    setMelding(null);
    const r = await bewaarKanalen({ data: { nummer, knopWhatsapp: wa, knopBellen: bel } }).catch(() => null);
    setBezig(false);
    if (!r?.ok) return setMelding({ ok: false, tekst: r?.message ?? "Saving did not work. Please try again." });
    setMelding({ ok: true, tekst: "Saved." });
    if (verder) klaar?.();
    else laad();
  }
  async function vraag(soort: "whatsapp" | "telefoon") {
    const r = await vraagKoppelingAan({ data: { soort } }).catch(() => null);
    if (!r?.ok) return setMelding({ ok: false, tekst: r?.message ?? "That did not work." });
    setMelding({ ok: true, tekst: "Requested. Volgo will contact you to set up the connection." });
    laad();
  }
  async function bewaarReview() {
    const r = review.trim();
    if (r && !/^https:\/\//.test(r)) return setReviewMelding("fout");
    const ok = await bewaarMijnWebsite({ data: { review_url: r } })
      .then(() => true)
      .catch(() => false);
    setReviewMelding(ok ? "ok" : "fout");
    if (ok && site) setSite({ ...site, reviewUrl: r });
  }

  const Badge = ({ s }: { s: Status }) => <span className={`v-g__status ${STATUS[s.status][1]}`}>{s.id === "website" && s.status !== "actief" ? "Not installed yet" : STATUS[s.status][0]}</span>;
  const Ontbreekt = ({ s }: { s: Status }) =>
    s.ontbreekt.length ? (
      <ul className="v-kn__mist">
        {s.ontbreekt.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    ) : null;

  const Nummer = (
    <section className="v-g__kaart">
      <h2>Your business number</h2>
      <p>The number customers call or WhatsApp you on.</p>
      <div className="v-g__form">
        <label className="v-g__veld">
          Phone number
          <input autoComplete="tel" disabled={!d.eigenaar} inputMode="tel" onChange={(e) => setNummer(e.target.value)} placeholder="06 12345678" value={nummer} />
        </label>
      </div>
    </section>
  );
  const Knoppen = (
    <>
      <label className="v-kn__rij">
        <div>
          <strong>WhatsApp button in your chat</strong>
          <small>Visitors see a “WhatsApp us” button in the chat. It opens WhatsApp with your number.</small>
        </div>
        <input checked={wa} className="v-kn__schakel" disabled={!d.eigenaar} onChange={(e) => setWa(e.target.checked)} type="checkbox" />
      </label>
      <label className="v-kn__rij">
        <div>
          <strong>Call button in your chat</strong>
          <small>Visitors see a “Call us” button in the chat. On a phone it calls your number right away.</small>
        </div>
        <input checked={bel} className="v-kn__schakel" disabled={!d.eigenaar} onChange={(e) => setBel(e.target.checked)} type="checkbox" />
      </label>
    </>
  );
  const Opslaan = d.eigenaar ? (
    <div className="v-g__knoppen" style={{ marginTop: 14 }}>
      <button className="v-g__knop" disabled={bezig} onClick={() => void bewaar(Boolean(onboarding))} type="button">
        {bezig ? "Saving…" : onboarding ? "Save and install Volgo" : "Save"}
      </button>
      {melding ? <span className={melding.ok ? "v-g__ok" : "v-g__fout"}>{melding.tekst}</span> : null}
    </div>
  ) : (
    <p className="v-g__leeg">Only the account owner can change this.</p>
  );

  // Right after the five questions: only the number and the two buttons, then on to installing.
  if (onboarding)
    return (
      <div className="v-g v-kn--onboarding">
        <header className="v-g__kop">
          <p className="v-kn__stap">Almost done · next you put Volgo on your website</p>
          <h1>How can customers reach you?</h1>
          <p>Your number, and whether visitors may WhatsApp or call you from the chat. You can change this later under Connections.</p>
        </header>
        {Nummer}
        <section className="v-g__kaart">
          <h2>Buttons in your chat</h2>
          <p>They open WhatsApp or the phone of your customer with your number. That conversation then happens in WhatsApp or on the phone, not in Volgo.</p>
          <div className="v-kn__lijst">{Knoppen}</div>
          {Opslaan}
        </section>
        <button className="v-kn__later" onClick={() => void slaKanalenOver().then(() => klaar?.())} type="button">
          Set this up later, install Volgo first
        </button>
      </div>
    );

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>Connections</h1>
        <p>Everything that lands in your inbox, and everything Volgo uses to reach your customers. Each line shows whether it is live.</p>
      </header>

      <section className="v-g__kaart">
        <h2>Into your inbox</h2>
        <p>Messages from these places land in one inbox. Volgo follows them up too.</p>
        <div className="v-kn__lijst">
          <div className="v-kn__rij">
            <div>
              <strong>Website chat</strong>
              <small>Volgo answers visitors, books appointments, and everything lands in your inbox.</small>
              <Ontbreekt s={st("website")} />
            </div>
            <div className="v-kn__rechts">
              <Badge s={st("website")} />
              {st("website").status !== "actief" && openTab ? (
                <button className="v-g__knop2" onClick={() => openTab("installeren")} type="button">
                  Install
                </button>
              ) : null}
            </div>
          </div>
          <div className="v-kn__rij v-kn__rij--blok">
            <div>
              <strong>Contact form</strong>
              <small>Point your own form at this address, or use this form. Every message lands in your inbox.</small>
            </div>
            <div className="v-kn__rechts">
              <span className="v-g__status">Optional</span>
            </div>
            {formulier ? (
              <details className="v-kn__meer">
                <summary>Show the form code</summary>
                <pre className="v-g__code">{formulier}</pre>
                <button className="v-g__knop2" onClick={() => kopieer(formulier, "form")} type="button">
                  {gekopieerd === "form" ? "Copied ✓" : "Copy the form"}
                </button>
              </details>
            ) : null}
          </div>
          {site?.mailIn ? (
            <div className="v-kn__rij v-kn__rij--blok">
              <div>
                <strong>Your email</strong>
                <small>Forward your business mail (or only website messages) from Gmail or Outlook to this address. Then it lands in your inbox too.</small>
              </div>
              <div className="v-kn__rechts">
                <span className="v-g__status">Optional</span>
              </div>
              <pre className="v-g__code">{`inbox-${site.sleutel}@thevolgo.app`}</pre>
            </div>
          ) : null}
          <div className="v-kn__rij">
            <div>
              <strong>WhatsApp messages</strong>
              <small>Messages to your WhatsApp number land in Volgo, with name and number, and you answer from the inbox. Meta verifies your business and number first; that usually takes a few days. We arrange this with you.</small>
              <Ontbreekt s={st("whatsapp")} />
            </div>
            <div className="v-kn__rechts">
              <Badge s={st("whatsapp")} />
              {st("whatsapp").status === "niet_gekoppeld" && d.eigenaar ? (
                <button className="v-g__knop2" onClick={() => void vraag("whatsapp")} type="button">
                  Request
                </button>
              ) : null}
            </div>
          </div>
          <div className="v-kn__rij">
            <div>
              <strong>Missed calls</strong>
              <small>
                You get a Volgo number that forwards to your own number. If you do not pick up, the caller is in your inbox with their number and you get a notification
                {d.smsTerug ? ", and the caller gets a text that you will call back" : ""}. We arrange this with you.
                {d.volgoNummer ? ` Your Volgo number: ${d.volgoNummer}.` : ""}
              </small>
              <Ontbreekt s={st("telefoon")} />
            </div>
            <div className="v-kn__rechts">
              <Badge s={st("telefoon")} />
              {st("telefoon").status === "niet_gekoppeld" && d.eigenaar ? (
                <button className="v-g__knop2" onClick={() => void vraag("telefoon")} type="button">
                  Request
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {Nummer}

      <section className="v-g__kaart">
        <h2>Buttons in your chat</h2>
        <p>They open WhatsApp or the phone of your customer with your number. That conversation then happens in WhatsApp or on the phone, not in Volgo.</p>
        <div className="v-kn__lijst">
          {Knoppen}
          <div className="v-kn__rij">
            <div>
              <strong>Call back and WhatsApp from Volgo</strong>
              <small>Every request with a phone number has a Call and a WhatsApp button. They open your own phone or WhatsApp.</small>
            </div>
            <span className="v-g__status is-aan">Live</span>
          </div>
        </div>
        {Opslaan}
      </section>

      <section className="v-g__kaart" id="mw-review">
        <div className="v-mw__kop">
          <h2 style={{ margin: 0 }}>Google reviews</h2>
          <span className={`v-g__status${site?.reviewUrl ? " is-aan" : ""}`}>{site?.reviewUrl ? "Live" : "No link yet"}</span>
        </div>
        <p>After an appointment Volgo asks for a review by itself. It needs your review link for that.</p>
        <div className="v-g__form">
          <label className="v-g__veld is-breed">
            Google review link
            <input inputMode="url" onChange={(e) => setReview(e.target.value)} placeholder="https://g.page/r/…/review" value={review} />
            <small>
              You find it in your Google Business Profile → <em>Ask for reviews</em> → copy the link.
            </small>
          </label>
          <div className="v-g__knoppen is-breed">
            <button className="v-g__knop" onClick={() => void bewaarReview()} type="button">
              Save
            </button>
            {reviewMelding === "ok" ? <span className="v-g__ok">Saved.</span> : null}
            {reviewMelding === "fout" ? <span className="v-g__fout">The link has to start with https://.</span> : null}
          </div>
        </div>
      </section>

      {openTab ? (
        <section className="v-g__kaart">
          <h2>Set up elsewhere</h2>
          <ul className="v-wiz__lijst">
            <li>
              <div>
                <strong>Calendar and opening hours</strong>
                <small>When customers can book, how long an appointment takes and which kinds.</small>
              </div>
              <button className="v-g__knop2" onClick={() => openTab("agenda")} type="button">
                Open Calendar
              </button>
            </li>
            <li>
              <div>
                <strong>Reminder and follow-up</strong>
                <small>Reminder the day before, follow-up after 1 and 3 days.</small>
              </div>
              <button className="v-g__knop2" onClick={() => openTab("automatisch")} type="button">
                Open Follow-up
              </button>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
