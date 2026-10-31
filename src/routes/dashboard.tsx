import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Account } from "@/components/dash/account";
import { Agenda } from "@/components/dash/agenda";
import { BillingButton } from "@/components/dash/billing-button";
import { Upsell } from "@/components/dash/upsell";
import { Website } from "@/components/dash/website";
import { AvaInstellen } from "@/components/dash/ava-instellen";
import { Gesprekken } from "@/components/dash/gesprekken";
import { Home } from "@/components/dash/home";
import { Overview } from "@/components/dash/overview";
import { TeamChat } from "@/components/dash/team-chat";
import { warmteLabel } from "@/components/dash/util";
import { VolgoMark } from "@/components/volgo/logo";
import { haalDashboard, uitloggen, zetLeadStatus } from "@/lib/api/account.functions";
import { isAdmin } from "@/lib/api/admin.functions";
import { ProfielFoto, ProfielKnop } from "@/components/dash/profiel";
import { checkNieuw } from "@/lib/api/ava.functions";
import { PLANS, isPlan } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const d = await haalDashboard();
    if (!d) throw redirect({ to: "/login", search: {} });
    if ("geblokkeerd" in d) throw redirect({ to: "/pricing", search: { expired: 1 } });
    return d;
  },
  head: () => ({ meta: [{ title: "Dashboard · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

type Tab = "home" | "website" | "overzicht" | "gesprekken" | "agenda" | "team" | "aanvragen" | "instellingen";
type Sub = "ava" | "stijl" | "installeren" | "meldingen" | "account" | "abonnement";
const SUBS: [Sub, string][] = [
  ["ava", "AVA"],
  ["stijl", "Style"],
  ["installeren", "Install"],
  ["meldingen", "Notifications"],
  ["account", "Account"],
  ["abonnement", "Subscription"],
];
const isSub = (t: string): t is Sub => SUBS.some(([id]) => id === t);
type Toast = { id: number; titel: string; tekst: string; tab: Tab; heet?: boolean };
type Status = "nieuw" | "opvolging" | "offerte" | "afspraak" | "klant" | "verloren";
const STATUS_LABEL: Record<Status, string> = {
  nieuw: "New",
  opvolging: "AVA following up",
  offerte: "Quote",
  afspraak: "Appointment",
  klant: "Customer",
  verloren: "Lost",
};

const datum = (iso: string) =>
  new Date(iso.replace(" ", "T") + "Z").toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

function Icon({ name }: { name: Tab | "uit" | "meer" | "ava" | "abonnement" | "account" }) {
  const d: Record<string, string> = {
    home: "M10 3.5l1.6 4.1 4.4.3-3.4 2.8 1.1 4.3L10 12.6 6.3 15l1.1-4.3L4 7.9l4.4-.3z",
    website: "M3 4.5h14v11H3zM3 7.5h14M6 6h.01M8 6h.01",
    instellingen: "M10 7.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM10 2.5l1.3 2 2.3-.6.6 2.3 2.2 1-1 2.2 1 2.2-2.2 1-.6 2.3-2.3-.6-1.3 2-1.3-2-2.3.6-.6-2.3-2.2-1 1-2.2-1-2.2 2.2-1 .6-2.3 2.3.6z",
    meer: "M4.5 10h.01M10 10h.01M15.5 10h.01",
    overzicht: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z",
    agenda: "M3.5 5.5h13v11h-13zM3.5 8.5h13M7 3.5v3M13 3.5v3",
    gesprekken: "M3.5 4.5h13v9h-6l-4 3v-3h-3z",
    ava: "M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM7.6 9h.01M12.4 9h.01M7.8 11.8c1.2 1 3.2 1 4.4 0",
    team: "M4 5.5h12v8H9l-3.5 3v-3H4z",
    aanvragen: "M3 5h14M3 10h14M3 15h9",
    abonnement: "M3 6h14v9H3zM3 9h14",
    account: "M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.5 17.5c.8-3 3.4-4.8 6.5-4.8s5.7 1.8 6.5 4.8",
    uit: "M8 4H4v12h4M12 6.5 15.5 10 12 13.5M15.5 10H8",
  };
  return (
    <svg aria-hidden="true" className="v-dash__icon" viewBox="0 0 20 20">
      <path d={d[name]} />
    </svg>
  );
}

function Dashboard() {
  const data = Route.useLoaderData();
  const { gebruiker: g } = data;
  const leads = [...data.leads].sort((a, b) => {
    const af = (x: typeof a) => (x.status === "klant" || x.status === "verloren" ? 1 : 0);
    return af(a) - af(b) || b.warmte - a.warmte;
  });
  const router = useRouter();
  const navigate = useNavigate();
  const [tab, setTabRaw] = useState<Tab>("home");
  const [sub, setSub] = useState<Sub>("ava");
  const [meer, setMeer] = useState(false);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    void isAdmin().then(setAdmin).catch(() => setAdmin(false));
  }, []);
  /** Go to a tab; settings pages ("ava", "account", …) open inside Settings. */
  const setTab = (t: string) => {
    if (isSub(t)) {
      setSub(t);
      setTabRaw("instellingen");
    } else setTabRaw(t as Tab);
    setMeer(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sinds = useRef(data.nu.slice(0, 19).replace("T", " "));

  // Meldingen: elke 15 seconden kijken of er nieuwe gesprekken of leads zijn.
  useEffect(() => {
    const id = window.setInterval(async () => {
      const r = await checkNieuw({ data: { sinds: sinds.current } }).catch(() => null);
      if (!r) return;
      sinds.current = r.nu;
      const nieuw: Toast[] = [];
      if (r.meldChat) for (const c of r.chats) nieuw.push({ id: Math.random(), titel: "New conversation with AVA", tekst: c.onderwerp, tab: "gesprekken" });
      if (r.meldLead) for (const l of r.leads) nieuw.push({ id: Math.random(), titel: `New lead: ${l.naam}`, tekst: `Warmth ${l.warmte} · ${l.onderwerp}`, tab: "aanvragen", heet: l.warmte >= 75 });
      if (!r.chats.length && !r.leads.length) return;
      void router.invalidate();
      if (!nieuw.length) return;
      setToasts((t) => [...t, ...nieuw].slice(-4));
      for (const n of nieuw) {
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 8000);
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
          try {
            new Notification(n.titel, { body: n.tekst, icon: "/icon-192.png" });
          } catch {
            /* sommige browsers staan dit alleen via een service worker toe */
          }
        }
      }
    }, 15000);
    return () => window.clearInterval(id);
  }, [router]);
  const plan = isPlan(g.plan) ? PLANS[g.plan] : PLANS.start;
  const voornaam = g.naam.split(/\s+/)[0];
  const proefDagen = g.proef_tot ? Math.max(0, Math.ceil((new Date(g.proef_tot.replace(" ", "T") + "Z").getTime() - Date.now()) / 86400000)) : 0;

  async function zetStatus(id: number, status: Status) {
    await zetLeadStatus({ data: { id, status } });
    await router.invalidate();
  }
  async function loguit() {
    await uitloggen();
    void navigate({ to: "/login", search: {} });
  }

  const tabs: [Tab, string][] = [
    ["home", "Home"],
    ["overzicht", "Overview"],
    ["gesprekken", "Chats"],
    ["aanvragen", "Requests"],
    ["agenda", "Calendar"],
    ["team", "Team"],
    ["website", "Website"],
    ["instellingen", "Settings"],
  ];
  // Mobile: four main tabs at the bottom, the rest under "More".
  const mobiel: [Tab, string][] = [
    ["home", "Home"],
    ["gesprekken", "Chats"],
    ["aanvragen", "Leads"],
    ["agenda", "Calendar"],
  ];

  return (
    <div className="volgo v-dash">
      <aside className="v-dash__side">
        <button aria-label="Volgo, go to home" className="v-nav__brand v-dash__brand" onClick={() => setTab("home")} type="button">
          <VolgoMark />
          <span>Volgo</span>
        </button>
        <nav aria-label="Dashboard" className="v-dash__nav">
          {tabs.map(([id, label]) => (
            <button aria-current={tab === id ? "page" : undefined} key={id} onClick={() => setTab(id)} type="button">
              <Icon name={id} />
              {label}
            </button>
          ))}
        </nav>
        <div className="v-dash__me">
          <button aria-label="Your profile and account" className="v-dash__me-knop" onClick={() => setTab("account")} type="button">
            <ProfielFoto foto={g.foto} maat={34} naam={g.naam} />
            <div>
              <strong>{g.naam}</strong>
              <small>
                {g.bedrijf} · {plan.naam}
              </small>
            </div>
          </button>
          {admin ? (
            <a className="v-dash__admin" href="/admin">
              Admin
            </a>
          ) : null}
          <button aria-label="Log out" className="v-dash__out" onClick={() => void loguit()} type="button">
            <Icon name="uit" />
          </button>
        </div>
      </aside>

      <div className="v-dash__profiel">
        <ProfielKnop admin={admin} g={g} loguit={() => void loguit()} openTab={(t) => setTab(t)} planNaam={plan.naam} />
      </div>
      <main className={`v-dash__main${tab === "team" && plan.limieten.teamChat ? " v-dash__main--full" : ""}${tab === "home" ? " v-dash__main--home" : ""}`}>
        {g.status === "proef" && proefDagen > 0 ? (
          <p className="v-dash__banner">
            Your free trial has {proefDagen} {proefDagen === 1 ? "day" : "days"} left. After that, Volgo {plan.naam} continues automatically at €{plan.prijsTekst} per month.
          </p>
        ) : null}

        {tab === "home" ? <Home bedrijf={g.bedrijf} openTab={(t) => setTab(t)} voornaam={voornaam} /> : null}
        {tab === "overzicht" ? <Overview data={data} openTab={(t) => setTab(t)} voornaam={voornaam} /> : null}
        {tab === "gesprekken" ? <Gesprekken data={data} /> : null}
        {tab === "agenda" ? <Agenda data={data} /> : null}
        {tab === "website" ? <Website /> : null}
        {tab === "team" ? (
          plan.limieten.teamChat ? (
            <TeamChat data={data} />
          ) : (
            <Upsell
              knop="Upgrade to Pro"
              punten={["Channels and private messages", "Video calls with one click", "Up to 5 users (unlimited on Premium)"]}
              tag="Pro and Premium"
              tekst="Bring your team into Volgo. Talk about leads, share updates and jump on a video call without leaving your dashboard."
              titel="Team chat and video calls"
            />
          )
        ) : null}

        {tab === "aanvragen" ? (
          <>
            <header className="v-dash__head">
              <h1>Requests</h1>
              <p>AVA puts the hottest leads at the top. Update the status once you have been in touch yourself.</p>
            </header>
            <section className="v-dash__panel v-dash__panel--flush">
              <div className="v-table" role="table">
                <div className="v-table__row v-table__row--head" role="row">
                  <span role="columnheader">Warmth</span>
                  <span role="columnheader">Customer</span>
                  <span role="columnheader">Via</span>
                  <span role="columnheader">Received</span>
                  <span role="columnheader">Status</span>
                </div>
                {leads.length === 0 ? (
                  <p className="v-feed__empty v-pad">No requests yet. As soon as a visitor leaves their details with AVA, they appear here, hottest first.</p>
                ) : null}
                {leads.map((l) => (
                  <div className="v-table__row" key={l.id} role="row">
                    <span role="cell">
                      <span className={`v-heat v-heat--${warmteLabel(l.warmte).toLowerCase()}`} title={l.reden ?? ""}>
                        {l.warmte}
                      </span>
                    </span>
                    <span role="cell">
                      <strong>{l.naam}</strong>
                      <small>{l.reden || l.onderwerp}</small>
                    </span>
                    <span role="cell">{l.kanaal}</span>
                    <span role="cell">{datum(l.created_at)}</span>
                    <span role="cell">
                      <select aria-label={`Status of ${l.naam}`} className={`v-select v-pill--${l.status}`} onChange={(e) => void zetStatus(l.id, e.target.value as Status)} value={l.status}>
                        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {tab === "instellingen" ? (
          <>
            <header className="v-dash__head">
              <h1>Settings</h1>
              <p>Everything you can adjust, in one place.</p>
            </header>
            <nav aria-label="Settings" className="v-instel__nav">
              {SUBS.map(([id, label]) => (
                <button aria-current={sub === id ? "page" : undefined} key={id} onClick={() => setSub(id)} type="button">
                  {label}
                </button>
              ))}
            </nav>
            {sub === "ava" ? <AvaInstellen deel="praten" /> : null}
            {sub === "stijl" ? <AvaInstellen deel="stijl" /> : null}
            {sub === "installeren" ? <AvaInstellen deel="installeren" /> : null}
            {sub === "meldingen" ? <AvaInstellen deel="meldingen" /> : null}
            {sub === "account" ? <Account g={g} leden={data.leden} loguit={() => void loguit()} openTab={(t) => setTab(t)} planNaam={plan.naam} /> : null}
            {sub === "abonnement" ? (
              <>
            <section className="v-dash__panel v-plan-card">
              <p className="v-plan-card__name">Volgo {plan.naam}</p>
              <p className="v-plan-card__price">€{plan.prijsTekst} <span>per month, excl. VAT</span></p>
              <p className="v-plan-card__state">
                {g.status === "proef" ? `Free trial, ${proefDagen} ${proefDagen === 1 ? "day" : "days"} left` : "Active"}
                {g.testmodus ? " · test account" : ""}
              </p>
              <div className="v-meter">
                <div className="v-meter__kop">
                  <span>AVA conversations this month</span>
                  <strong>
                    {data.gebruik.gesprekken.toLocaleString("en-GB")} / {plan.limieten.gesprekken.toLocaleString("en-GB")}
                  </strong>
                </div>
                <div aria-hidden="true" className="v-meter__balk">
                  <i
                    className={data.gebruik.gesprekken >= plan.limieten.gesprekken ? "is-vol" : ""}
                    style={{ width: `${Math.min(100, (data.gebruik.gesprekken / plan.limieten.gesprekken) * 100)}%` }}
                  />
                </div>
                {data.gebruik.gesprekken >= plan.limieten.gesprekken ? (
                  <p className="v-small">
                    You've reached this month's limit. AVA keeps capturing leads in basic mode. <a href="/pricing">Upgrade</a> for smart replies again.
                  </p>
                ) : null}
              </div>
              <ul className="v-plan__list">
                {[...plan.kern, ...plan.features].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {g.rol === "eigenaar" ? <BillingButton /> : <p className="v-plan-card__help">Only the account owner can manage the subscription.</p>}
            </section>
              </>
            ) : null}
          </>
        ) : null}
      </main>
      <nav aria-label="Main" className="v-mnav">
        {mobiel.map(([id, label]) => (
          <button aria-current={tab === id ? "page" : undefined} key={id} onClick={() => setTab(id)} type="button">
            <Icon name={id} />
            <span>{label}</span>
          </button>
        ))}
        <button aria-current={meer || !mobiel.some(([id]) => id === tab) ? "page" : undefined} aria-expanded={meer} onClick={() => setMeer(!meer)} type="button">
          <Icon name="meer" />
          <span>More</span>
        </button>
      </nav>
      {meer ? (
        <div className="v-sheet" onClick={() => setMeer(false)} role="presentation">
          <div aria-label="More" className="v-sheet__paneel" onClick={(e) => e.stopPropagation()} role="dialog">
            <span aria-hidden="true" className="v-sheet__greep" />
            {(["overzicht", "team", "website", "instellingen"] as Tab[]).map((id) => (
              <button key={id} onClick={() => setTab(id)} type="button">
                <Icon name={id} />
                {tabs.find((t) => t[0] === id)?.[1]}
              </button>
            ))}
            <button onClick={() => setTab("abonnement")} type="button">
              <Icon name="abonnement" />
              Subscription
            </button>
            {admin ? (
              <a className="v-sheet__link" href="/admin">
                <Icon name="overzicht" />
                Volgo admin
              </a>
            ) : null}
            <button className="v-sheet__uit" onClick={() => void loguit()} type="button">
              <Icon name="uit" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
      <div aria-live="polite" className="v-toasts">
        {toasts.map((t) => (
          <button
            className={`v-toast${t.heet ? " v-toast--heet" : ""}`}
            key={t.id}
            onClick={() => {
              setTab(t.tab);
              setToasts((x) => x.filter((y) => y.id !== t.id));
            }}
            type="button"
          >
            <strong>{t.titel}</strong>
            <span>{t.tekst}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
