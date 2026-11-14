import { type JSX, useEffect } from "react";

import { AvaChat } from "./ava-chat";
import { Footer } from "./footer";
import { PijnScroll } from "./pijn-scroll";
import { type RouteTaal } from "./route-teksten";
import { Vertaler, opgeslagenTaal, toonTaal } from "./taal";
import { InstallUitleg, type Kijker, Kop, Prijzen, useOnthul } from "./wit";
import { INSTALL_MINUTEN, WEBSITE_SOORTEN } from "@/lib/installatie";
import { PLANS } from "@/lib/plans";

/** The page is written in English and shown in English. Another language only when the visitor picks one at the top. */
const BRON = "en";
const VANAF = `€${PLANS.starter.prijsTekst}`;

/** One visitor, from opening the chat to the appointment. Every line is something the app really does. */
const REIS: { tijd: string; titel: string; tekst: string; ok?: boolean }[] = [
  { tijd: "Tue 9:14 pm", titel: "A visitor opens the chat", tekst: "On your own website. You finished work hours ago." },
  { tijd: "Tue 9:15 pm", titel: "Volgo asks your questions", tekst: "What you want to know before the appointment." },
  { tijd: "Tue 9:17 pm", titel: "The visitor picks Thursday 3:00 pm", tekst: "Only your free times. Never double booked." },
  { tijd: "Tue 9:17 pm", titel: "Appointment in your inbox and calendar", tekst: "With name, number and every answer. The confirmation is sent.", ok: true },
  { tijd: "Wed 3:00 pm", titel: "Reminder", tekst: "The day before, by itself." },
  { tijd: "Thu 4:00 pm", titel: "After the appointment", tekst: "Volgo asks for a Google review." },
];

const ZONDER = ["Requests in your mail, your apps and your head", "Answering when you are done working", "Texting back and forth about a time", "Forgetting to follow up", "No idea who is still waiting"];
const MET = ["Everything in one inbox", "Every visitor gets an answer right away", "Visitors book an appointment themselves", "Follow-up after 1 and 3 days, by itself", "You see at a glance who is still waiting"];

const FAQ: [string, string][] = [
  ["What is Volgo?", "An appointment setter for your website. Visitors book an appointment themselves, everything lands in one inbox, and Volgo follows up automatically. Also when someone does not book right away."],
  ["Who is Volgo made for?", "For businesses that get customers through appointments on their website. Think of detailers, hairdressers, salons, gardeners, installers, coaches and practices."],
  ["Do I need a new website?", "No. Volgo goes into the website you already have. No website, or ready for a new one? Then there is Complete: we build your website, with Volgo inside and your domain included."],
  ["Which websites does it work on?", `Any website where you can paste one line of code: ${WEBSITE_SOORTEN.join(", ")}. Your dashboard shows where to paste the line, per kind of website.`],
  ["How fast is it on my website?", `About ${INSTALL_MINUTEN} minutes if you do it yourself: five questions, your hours, paste one line and check. Your dashboard walks you through it step by step.`],
  ["I know nothing about code. Can I do this?", "Yes. It is copy and paste. Does someone else manage your website? Then one button sends them the line. On Growth and Pro we put it in for you."],
  ["What is automatic follow-up?", "Someone leaves their details but does not book? Volgo sends a message after 1 day and after 3 days. Whoever does book gets a confirmation, a reminder and, after the appointment, a request for a review."],
  ["What counts as a conversation?", "One visitor chatting with Volgo on your website. Reached your number for the month? Volgo still catches requests, in a simple mode. So you never lose anyone."],
  ["Can I cancel?", "Yes, any month. You do it yourself in your dashboard. Your own website stays exactly as it is."],
  ["Does it work in my Instagram DMs?", "No. Volgo works on your website. Put your website in your bio and send people there: that is where Volgo takes over."],
];

/** The dashboard as a picture: the inbox with one conversation open. Drawn in HTML, so it is sharp on every screen. */
function InboxBeeld() {
  return (
    <div aria-hidden="true" className="vn-app">
      <div className="vn-app__balk">
        <i />
        <i />
        <i />
        <span>thevolgo.app/dashboard</span>
      </div>
      <div className="vn-app__in">
        <div className="vn-app__zij">
          <b>Volgo</b>
          <span className="is-aan">
            Inbox <em>3</em>
          </span>
          <span>Calendar</span>
          <span>Requests</span>
          <span>Follow-up</span>
          <small>Setup</small>
          <span>Install</span>
          <span>My website</span>
          <span>Connections</span>
        </div>
        <div className="vn-app__lijst">
          <p className="vn-app__kop">Inbox</p>
          <div className="vn-app__rij is-open">
            <b>Anna de Vries</b>
            <span>Appointment booked · Wed 2:00 pm</span>
            <em className="is-ok">Booked</em>
          </div>
          <div className="vn-app__rij">
            <b>Mark Jansen</b>
            <span>Wants a price for the interior</span>
            <em>Volgo follows up</em>
          </div>
          <div className="vn-app__rij">
            <b>Sara El Amrani</b>
            <span>Asks if Saturday works</span>
            <em className="is-nieuw">New</em>
          </div>
          <div className="vn-app__rij">
            <b>Tom Bakker</b>
            <span>Contact form · quote</span>
            <em>Volgo follows up</em>
          </div>
        </div>
        <div className="vn-app__chat">
          <p className="vn-app__kop">Anna de Vries · website chat</p>
          <p className="vn-bel is-zij">Hi, can I book an appointment for next week?</p>
          <p className="vn-bel">Sure. What is it for, and what is your phone number?</p>
          <p className="vn-bel is-zij">A full treatment. 555 0142.</p>
          <p className="vn-bel">Great. Pick a time that suits you.</p>
          <p className="vn-bel is-ok">✓ Appointment booked: Wednesday 2:00 pm</p>
          <p className="vn-app__auto">Confirmation sent · reminder scheduled</p>
        </div>
      </div>
    </div>
  );
}

/** A piece of a website with the Volgo chat open on it: the visitor picks a time. */
function BoekBeeld() {
  return (
    <div aria-hidden="true" className="vn-site">
      <div className="vn-app__balk">
        <i />
        <i />
        <i />
        <span>yourwebsite.com</span>
      </div>
      <div className="vn-site__in">
        <div className="vn-site__blok is-kop" />
        <div className="vn-site__blok" />
        <div className="vn-site__blok is-kort" />
        <div className="vn-site__chat">
          <p className="vn-site__chatkop">Book your appointment</p>
          <p className="vn-bel">Which day suits you?</p>
          <div className="vn-site__tijden">
            <span>Wed 10:00</span>
            <span className="is-aan">Wed 2:00</span>
            <span>Thu 9:30</span>
            <span>Fri 4:00</span>
          </div>
          <p className="vn-bel is-ok">✓ Wednesday 2:00 pm is booked</p>
        </div>
      </div>
    </div>
  );
}

/** What Volgo sends by itself, before and after the appointment. */
function OpvolgBeeld() {
  const rijen: [string, string, string][] = [
    ["Right away", "Confirmation", "With day, time and a button to add it to their calendar."],
    ["Day before", "Reminder", "Fewer people who forget to show up."],
    ["After 1 day", "Follow-up", "For whoever left their details but did not book."],
    ["After 3 days", "Once more", "It stops as soon as someone answers or books."],
    ["After the appointment", "Review request", "Volgo asks for a Google review."],
  ];
  return (
    <div aria-hidden="true" className="vn-auto">
      {rijen.map(([wanneer, wat, uitleg]) => (
        <div className="vn-auto__rij" key={wat}>
          <em>{wanneer}</em>
          <div>
            <b>{wat}</b>
            <span>{uitleg}</span>
          </div>
          <i>On</i>
        </div>
      ))}
    </div>
  );
}

/** The dashboard page "Mijn website": your own site with Volgo on it, and whether it is live. */
function WebsiteBeeld() {
  return (
    <div aria-hidden="true" className="vn-site vn-site--mijn">
      <div className="vn-site__status">
        <b>My website</b>
        <em className="is-ok">✓ Volgo is live</em>
      </div>
      <div className="vn-app__balk">
        <i />
        <i />
        <i />
        <span>yourwebsite.com</span>
      </div>
      <div className="vn-site__in">
        <div className="vn-site__blok is-kop" />
        <div className="vn-site__blok" />
        <div className="vn-site__blok is-kort" />
        <div className="vn-site__bol">Book an appointment</div>
      </div>
    </div>
  );
}

const FUNCTIES: { oog: string; titel: string; tekst: string; punten: string[]; beeld: () => JSX.Element }[] = [
  {
    oog: "Inbox",
    titel: "Everything in one place.",
    tekst: "Chat, contact form and appointments land in one inbox. You see who is waiting, who has booked and who Volgo is still following up.",
    punten: ["Read along with every conversation, or take over yourself", "Name, number and every answer included", "A notification on your phone for every appointment"],
    beeld: InboxBeeld,
  },
  {
    oog: "Appointments",
    titel: "Visitors book themselves.",
    tekst: "Volgo asks your questions and lets the visitor pick a time. Only the times that work for you.",
    punten: ["Your opening hours and appointment length", "A call, a visit or at your office", "Never double booked"],
    beeld: BoekBeeld,
  },
  {
    oog: "Follow-up",
    titel: "Volgo follows up. And keeps following up.",
    tekst: "Nobody slips through. Before the appointment, after the appointment, and also when someone has not booked yet.",
    punten: ["Follow-up after 1 and 3 days", "Confirmation and reminder", "Review request after the appointment"],
    beeld: OpvolgBeeld,
  },
  {
    oog: "My website",
    titel: "See your website, with Volgo in it.",
    tekst: "Your dashboard shows your own website with the chat on it, on desktop and phone. And whether Volgo is live.",
    punten: ["Try the chat the way your visitor sees it", "Your own name, photo and colour", "One button checks that everything works"],
    beeld: WebsiteBeeld,
  },
];

/**
 * The landing page: Volgo is an appointment setter for websites. Visitors plan an appointment, everything lands in one
 * inbox, and Volgo follows up by itself. What it does, how you install it, what it costs.
 */
export function LandingPagina({ kijker, vast }: { kijker: Kijker; vast?: RouteTaal }) {
  useOnthul("volgo-home");
  // thevolgo.app/nl (for Dutch ads): the same page, shown in Dutch unless the visitor already chose a language.
  useEffect(() => {
    if (vast === "nl" && !opgeslagenTaal()) toonTaal("nl");
  }, [vast]);
  const doel = kijker.ingelogd ? "/dashboard" : "#pricing";
  return (
    <div className="volgo vn" id="volgo-home">
      <Kop bron={BRON} kijker={kijker} />

      <main>
        <section aria-labelledby="vn-titel" className="vn-hero">
          <p className="vn-oog">Appointment setter for your website</p>
          <h1 className="vn-h1" id="vn-titel">
            Your website is missing appointments.
            <br />
            <em>Volgo books them.</em>
          </h1>
          <p className="vn-sub">Visitors book an appointment themselves, in your website. Everything lands in one inbox. Volgo follows up automatically, and keeps following up.</p>
          <div className="vn-hero__knoppen">
            <a className="vn-knop" href={doel}>
              {kijker.ingelogd ? "Go to your dashboard" : "Start with Volgo"}
            </a>
            <a className="vn-knop vn-knop--licht" href="#features">
              See how it works
            </a>
          </div>
          <p className="vn-klein">
            From {VANAF} per month · Installed by yourself in about {INSTALL_MINUTEN} minutes · Cancel any month
          </p>
          <div className="vn-hero__beeld" data-rv="">
            <InboxBeeld />
          </div>
        </section>

        <section aria-label="Which websites" className="vn-werkt" data-rv="">
          <p>Built for websites with bookings. Works on:</p>
          <ul className="vn-chips" data-notranslate="">
            {WEBSITE_SOORTEN.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <PijnScroll />

        <section aria-labelledby="vn-reis" className="vn-sectie vn-reis">
          <header className="vn-sectie__kop" data-rv="">
            <p className="vn-oog">How it goes</p>
            <h2 className="vn-h2" id="vn-reis">
              From visitor to appointment. Without you doing a thing.
            </h2>
          </header>
          <ol className="vn-reis__lijn">
            {REIS.map((r) => (
              <li className={r.ok ? "is-ok" : ""} data-rv="" key={r.titel}>
                <em>{r.tijd}</em>
                <b>{r.titel}</b>
                <span>{r.tekst}</span>
              </li>
            ))}
          </ol>
          <p className="vn-reis__niet" data-rv="">
            <b>Not booked?</b> Then Volgo follows up after 1 day and after 3 days. By itself.
          </p>
        </section>

        <section aria-labelledby="vn-hou" className="vn-sectie vn-hou">
          <header className="vn-sectie__kop" data-rv="">
            <p className="vn-oog">Your own website</p>
            <h2 className="vn-h2" id="vn-hou">
              Keep the website you already have.
            </h2>
          </header>
          <div className="vn-drie">
            <div className="vn-kaart" data-rv="">
              <h3>No new website needed</h3>
              <p>Volgo goes into the website you already have. Your website itself does not change.</p>
            </div>
            <div className="vn-kaart" data-rv="">
              <h3>Paste one line</h3>
              <p>After that Volgo is on every page. Do it yourself, forward it, or let us do it.</p>
            </div>
            <div className="vn-kaart" data-rv="">
              <h3>No website yet?</h3>
              <p>
                Then we build it, with Volgo inside and your domain included. <a href="#pricing">See Complete</a>
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Features" className="vn-sectie vn-functies" id="features">
          {FUNCTIES.map((f, i) => (
            <article className={`vn-functie${i % 2 ? " is-om" : ""}`} key={f.oog}>
              <div className="vn-functie__tekst" data-rv="">
                <p className="vn-oog">{f.oog}</p>
                <h2 className="vn-h2">{f.titel}</h2>
                <p className="vn-sub">{f.tekst}</p>
                <ul className="vn-vink">
                  {f.punten.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <a className="vn-knop vn-knop--klein" href={doel}>
                  {kijker.ingelogd ? "Go to your dashboard" : "Start with Volgo"}
                </a>
              </div>
              <div className="vn-functie__beeld" data-rv="">
                {i === 0 ? (
                  <div className="vn-inboxkaart" aria-hidden="true">
                    <div className="vn-app__rij is-open">
                      <b>Anna de Vries</b>
                      <span>Website chat · appointment Wed 2:00 pm</span>
                      <em className="is-ok">Booked</em>
                    </div>
                    <div className="vn-app__rij">
                      <b>Mark Jansen</b>
                      <span>Website chat · wants a price</span>
                      <em>Volgo follows up</em>
                    </div>
                    <div className="vn-app__rij">
                      <b>Sara El Amrani</b>
                      <span>Website chat · asks if Saturday works</span>
                      <em className="is-nieuw">New</em>
                    </div>
                    <div className="vn-app__rij">
                      <b>Tom Bakker</b>
                      <span>Contact form · quote</span>
                      <em>Volgo follows up</em>
                    </div>
                    <div className="vn-app__rij">
                      <b>Lisa Peeters</b>
                      <span>Website chat · appointment Fri 9:30 am</span>
                      <em className="is-ok">Booked</em>
                    </div>
                  </div>
                ) : (
                  <f.beeld />
                )}
              </div>
            </article>
          ))}
        </section>

        <InstallUitleg />

        <section aria-labelledby="vn-zm" className="vn-sectie vn-zm">
          <header className="vn-sectie__kop" data-rv="">
            <p className="vn-oog">The difference</p>
            <h2 className="vn-h2" id="vn-zm">
              Without Volgo. With Volgo.
            </h2>
          </header>
          <div className="vn-zm__grid">
            <ul className="vn-zm__zonder" data-rv="">
              <li className="vn-zm__kop">Without Volgo</li>
              {ZONDER.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <ul className="vn-zm__met" data-rv="">
              <li className="vn-zm__kop">With Volgo</li>
              {MET.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <Prijzen kijker={kijker} />

        <section aria-labelledby="vn-faq" className="vn-sectie vn-faq" id="faq">
          <header className="vn-sectie__kop" data-rv="">
            <p className="vn-oog">FAQ</p>
            <h2 className="vn-h2" id="vn-faq">
              Frequently asked questions
            </h2>
          </header>
          <div className="vn-faq__lijst">
            {FAQ.map(([v, a]) => (
              <details key={v}>
                <summary>{v}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="vn-slot" className="vn-slot">
          <h2 className="vn-h1" data-rv="" id="vn-slot">
            You work.
            <br />
            <em>Volgo books.</em>
          </h2>
          <div className="vn-hero__knoppen" data-rv="">
            <a className="vn-knop" href={doel}>
              {kijker.ingelogd ? "Go to your dashboard" : "Start with Volgo"}
            </a>
          </div>
          <p className="vn-klein">Questions first? Email volgo.app@outlook.com or send a DM to @thevolgo.app on Instagram.</p>
        </section>
      </main>
      <Footer />
      <Vertaler bron={BRON} />
      <AvaChat />
    </div>
  );
}
