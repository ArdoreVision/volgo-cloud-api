import { type JSX, useEffect } from "react";

import { AvaChat } from "./ava-chat";
import { Footer } from "./footer";
import { PijnScroll } from "./pijn-scroll";
import { PostVogel, VogelLader } from "./post-vogel";
import { InstallUitleg, type Kijker, Kop, Prijzen, useOnthul } from "./wit";
import { DRIE_D_UITLEG, PLANS } from "@/lib/plans";

/** The page is written in English and shown in English. Another language only when the visitor picks one at the top. */
const VANAF = `€${PLANS.starter.prijsTekst}`;

/** One visitor, from opening the chat to the appointment. Every line is something the app really does. */
const REIS: { tijd: string; titel: string; tekst: string; ok?: boolean }[] = [
  { tijd: "Tue 9:14 pm", titel: "A visitor opens the chat", tekst: "On your website. You finished work hours ago." },
  { tijd: "Tue 9:15 pm", titel: "Volgo asks your questions", tekst: "What you want to know before the appointment." },
  { tijd: "Tue 9:17 pm", titel: "The visitor picks Thursday 3:00 pm", tekst: "Only times that are free in Volgo and in your own calendar." },
  { tijd: "Tue 9:17 pm", titel: "Appointment in your inbox and calendar", tekst: "With name, number and every answer. The confirmation is sent.", ok: true },
  { tijd: "Wed 3:00 pm", titel: "Reminder", tekst: "The day before, by itself." },
  { tijd: "Thu 4:00 pm", titel: "After the appointment", tekst: "Volgo asks for a Google review." },
];

const ZONDER = ["Requests in your mail, your apps and your head", "Answering when you are done working", "Texting back and forth about a time", "Forgetting to follow up", "No idea who is still waiting"];
const MET = ["Every chat and request in one inbox", "Every visitor gets an answer right away", "Visitors book an appointment themselves", "Follow-up after 1 and 3 days, by itself", "You see at a glance who is still waiting"];

const FAQ: [string, string][] = [
  ["What is Volgo?", "A complete website with an appointment setter inside. Volgo builds your website, visitors book an appointment themselves, everything lands in one inbox, and Volgo follows up automatically. Also when someone does not book right away."],
  ["Who is Volgo made for?", "For businesses that get customers through appointments on their website. Think of detailers, hairdressers, salons, gardeners, installers, coaches and practices."],
  ["What is a 3D website?", DRIE_D_UITLEG],
  ["Do I get a new website?", "Yes, with every plan. You tell Volgo about your business and Volgo builds a complete 3D website with the appointment setter inside. With Complete the team finishes your 3D website to measure, with a 1-on-1 call."],
  ["Can I use my own domain name?", "Yes. You fill in the domain you own and get the two lines to pass on to whoever manages it. Until it is connected, your website is online on a Volgo address. Buying a domain name is only included with Complete."],
  ["How fast is my website ready?", "You fill in your business details in a few minutes. Volgo then builds your website in one to two minutes. You look at it, change what you want and press Publish."],
  ["I know nothing about websites. Can I do this?", "Yes. You answer questions about your business in plain words. Want something changed? Type it in the chat in your dashboard and Volgo changes your website."],
  ["What is automatic follow-up?", "Someone leaves their details but does not book? Volgo sends a message after 1 day and after 3 days. Whoever does book gets a confirmation, a reminder and, after the appointment, a request for a review."],
  ["Does it work with my own calendar?", "Yes. Link Google Calendar, Outlook or Apple Calendar in your dashboard with its private calendar address. Volgo reads the busy times and never offers those to visitors. Volgo's own appointments can show up in your calendar too."],
  ["Do WhatsApp and phone calls land in Volgo too?", "Your website chat and contact form do right away, and your email when you forward it. WhatsApp messages and missed calls land in the inbox once we connect them with you; that takes a few days because Meta verifies your business first."],
  ["What counts as a conversation?", "One visitor chatting with Volgo on your website. Reached your number for the month? Volgo still catches requests, in a simple mode. So you never lose anyone."],
  ["Can I cancel?", "Yes, any month. You do it yourself in your dashboard. The website Volgo built and the appointment setter then go offline; your domain name stays yours."],
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
          <span>Website</span>
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
    tekst: "Volgo asks your questions and lets the visitor pick a time. Only the times that are free, in Volgo and in your own calendar.",
    punten: ["Your opening hours and appointment length", "Links with Google, Outlook or Apple Calendar", "Times taken in your own calendar are never offered"],
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
    tekst: "Your dashboard shows your website with the chat on it, on desktop and phone. Change it by typing what you want.",
    punten: ["Try the chat the way your visitor sees it", "Your own name, photo and colour", "Change your website by chat"],
    beeld: WebsiteBeeld,
  },
];

/**
 * The landing page: Volgo is an appointment setter for websites. Visitors plan an appointment, everything lands in one
 * inbox, and Volgo follows up by itself. What it does, how your website gets built, what it costs.
 */
export function LandingPagina({ kijker }: { kijker: Kijker }) {
  useOnthul("volgo-home");
  const doel = kijker.ingelogd ? "/dashboard" : "#pricing";
  return (
    <div className="volgo vn" id="volgo-home">
      <Kop kijker={kijker} />

      <main>
        <section aria-labelledby="vn-titel" className="vn-hero" data-vogel="Hi! I'm Volgo, your post bird. I deliver every message.">
          <p className="vn-oog">Appointment setter for your website</p>
          <h1 className="vn-h1" id="vn-titel">
            Your website is missing appointments.
            <br />
            <em>Volgo books them.</em>
          </h1>
          <p className="vn-sub">Volgo builds your complete website, with an appointment setter inside. Visitors book themselves, every chat and request lands in one inbox, and Volgo follows up automatically.</p>
          <div className="vn-hero__knoppen">
            <a className="vn-knop" href={doel}>
              {kijker.ingelogd ? "Go to your dashboard" : "Start with Volgo"}
            </a>
            <a className="vn-knop vn-knop--licht" href="#features">
              See how it works
            </a>
          </div>
          <p className="vn-klein">
            From {VANAF} per month · Your website built in minutes · Cancel any month
          </p>
          <div className="vn-hero__beeld" data-rv="">
            <InboxBeeld />
          </div>
        </section>

        <PijnScroll />

        <section aria-labelledby="vn-reis" className="vn-sectie vn-reis" data-vogel="I answer right away, book the time and send the confirmation. For you and your customer.">
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

        <section aria-labelledby="vn-hou" className="vn-sectie vn-hou" data-vogel="Tell me about your business. I build your website.">
          <header className="vn-sectie__kop" data-rv="">
            <p className="vn-oog">Your website</p>
            <h2 className="vn-h2" id="vn-hou">
              A complete new website, with every plan.
            </h2>
          </header>
          <div className="vn-drie">
            <div className="vn-kaart" data-rv="">
              <h3>Built for you</h3>
              <p>You tell Volgo about your business. Volgo builds your complete website in one to two minutes, on your own domain.</p>
            </div>
            <div className="vn-kaart" data-rv="">
              <h3>Volgo is already in it</h3>
              <p>The appointment setter is on your website from the first minute. No code, nothing to install.</p>
            </div>
            <div className="vn-kaart" data-rv="">
              <h3>Want to stand out?</h3>
              <p>
                With Complete the team finishes your 3D website to measure, with a 1-on-1 call. <a href="#pricing">See Complete</a>
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Features" className="vn-sectie vn-functies" data-vogel="I bring every request and all the details straight to you." id="features">
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

        <section aria-labelledby="vn-zm" className="vn-sectie vn-zm" data-vogel="No more chasing. I keep following up.">
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

        <section aria-labelledby="vn-faq" className="vn-sectie vn-faq" data-vogel="Questions? The answers are right here." id="faq">
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

        <section aria-labelledby="vn-slot" className="vn-slot" data-vogel="Ready when you are. Pick a plan above.">
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
      <PostVogel />
      <VogelLader />
      <AvaChat />
    </div>
  );
}
