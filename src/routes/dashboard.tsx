import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Account } from "@/components/dash/account";
import { Agenda } from "@/components/dash/agenda";
import { AvaInstellen } from "@/components/dash/ava-instellen";
import { Gesprekken } from "@/components/dash/gesprekken";
import { Home } from "@/components/dash/home";
import { Overview } from "@/components/dash/overview";
import { TeamChat } from "@/components/dash/team-chat";
import { warmteLabel } from "@/components/dash/util";
import { VolgoMark } from "@/components/volgo/logo";
import { haalDashboard, uitloggen, zetLeadStatus } from "@/lib/api/account.functions";
import { checkNieuw } from "@/lib/api/ava.functions";
import { PLANS, isPlan } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const d = await haalDashboard();
    if (!d) throw redirect({ to: "/login", search: {} });
    if ("geblokkeerd" in d) throw redirect({ to: "/pricing", search: { expired: "1" } });
    return d;
  },
  head: () => ({ meta: [{ title: "Dashboard · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

type Tab = "home" | "overzicht" | "gesprekken" | "agenda" | "team" | "aanvragen" | "ava" | "abonnement" | "account";
type Toast = { id: number; titel: string; tekst: string; tab: Tab; heet?: boolean };
type Status = "nieuw" | "opvolging" | "offerte" | "afspraak" | "klant" | "verloren";
const STATUS_LABEL: Record<Status, string> = {
  nieuw: "Nieuw",
  opvolging: "AVA volgt op",
  offerte: "Offerte",
  afspraak: "Afspraak",
  klant: "Klant",
  verloren: "Verloren",
};

const datum = (iso: string) =>
  new Date(iso.replace(" ", "T") + "Z").toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

function Icon({ name }: { name: Tab | "uit" }) {
  const d: Record<string, string> = {
    home: "M10 3.5l1.6 4.1 4.4.3-3.4 2.8 1.1 4.3L10 12.6 6.3 15l1.1-4.3L4 7.9l4.4-.3z",
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
  const [tab, setTab] = useState<Tab>("home");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sinds = useRef(data.nu.slice(0, 19).replace("T", " "));

  // Meldingen: elke 15 seconden kijken of er nieuwe gesprekken of leads zijn.
  useEffect(() => {
    const id = window.setInterval(async () => {
      const r = await checkNieuw({ data: { sinds: sinds.current } }).catch(() => null);
      if (!r) return;
      sinds.current = r.nu;
      const nieuw: Toast[] = [];
      if (r.meldChat) for (const c of r.chats) nieuw.push({ id: Math.random(), titel: "Nieuw gesprek met AVA", tekst: c.onderwerp, tab: "gesprekken" });
      if (r.meldLead) for (const l of r.leads) nieuw.push({ id: Math.random(), titel: `Nieuwe lead: ${l.naam}`, tekst: `Warmte ${l.warmte} · ${l.onderwerp}`, tab: "aanvragen", heet: l.warmte >= 75 });
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
    ["overzicht", "Overzicht"],
    ["gesprekken", "Gesprekken"],
    ["agenda", "Agenda"],
    ["team", "Team"],
    ["aanvragen", "Aanvragen"],
    ["ava", "AVA"],
    ["abonnement", "Abonnement"],
    ["account", "Account"],
  ];

  return (
    <div className="volgo v-dash">
      <aside className="v-dash__side">
        <button aria-label="Volgo, naar home" className="v-nav__brand v-dash__brand" onClick={() => setTab("home")} type="button">
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
          <span className="v-dash__avatar" aria-hidden="true">
            {g.bedrijf.trim()[0]?.toUpperCase()}
          </span>
          <div>
            <strong>{g.bedrijf}</strong>
            <small>{plan.naam}</small>
          </div>
          <button aria-label="Uitloggen" className="v-dash__out" onClick={() => void loguit()} type="button">
            <Icon name="uit" />
          </button>
        </div>
      </aside>

      <main className={`v-dash__main${tab === "team" ? " v-dash__main--full" : ""}${tab === "home" ? " v-dash__main--home" : ""}`}>
        {g.status === "proef" && proefDagen > 0 ? (
          <p className="v-dash__banner">
            Je proefperiode loopt nog {proefDagen} {proefDagen === 1 ? "dag" : "dagen"}. Daarna gaat Volgo {plan.naam} automatisch verder voor € {plan.prijsTekst} per maand.
          </p>
        ) : null}

        {tab === "home" ? <Home bedrijf={g.bedrijf} openTab={(t) => setTab(t)} voornaam={voornaam} /> : null}
        {tab === "overzicht" ? <Overview data={data} openTab={(t) => setTab(t)} voornaam={voornaam} /> : null}
        {tab === "gesprekken" ? <Gesprekken data={data} /> : null}
        {tab === "ava" ? <AvaInstellen /> : null}
        {tab === "agenda" ? <Agenda data={data} /> : null}
        {tab === "team" ? <TeamChat data={data} /> : null}

        {tab === "aanvragen" ? (
          <>
            <header className="v-dash__head">
              <h1>Aanvragen</h1>
              <p>AVA zet de warmste leads bovenaan. Pas de status aan als je zelf contact hebt gehad.</p>
            </header>
            <section className="v-dash__panel v-dash__panel--flush">
              <div className="v-table" role="table">
                <div className="v-table__row v-table__row--head" role="row">
                  <span role="columnheader">Warmte</span>
                  <span role="columnheader">Klant</span>
                  <span role="columnheader">Via</span>
                  <span role="columnheader">Binnen</span>
                  <span role="columnheader">Status</span>
                </div>
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
                      <select aria-label={`Status van ${l.naam}`} className={`v-select v-pill--${l.status}`} onChange={(e) => void zetStatus(l.id, e.target.value as Status)} value={l.status}>
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

        {tab === "abonnement" ? (
          <>
            <header className="v-dash__head">
              <h1>Abonnement</h1>
            </header>
            <section className="v-dash__panel v-plan-card">
              <p className="v-plan-card__name">Volgo {plan.naam}</p>
              <p className="v-plan-card__price">€ {plan.prijsTekst} <span>per maand, excl. btw</span></p>
              <p className="v-plan-card__state">
                {g.status === "proef" ? `Proefperiode, nog ${proefDagen} ${proefDagen === 1 ? "dag" : "dagen"}` : "Actief"}
                {g.testmodus ? " · testaccount" : ""}
              </p>
              <ul className="v-plan__list">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="v-plan-card__help">
                Wil je je abonnement wijzigen of opzeggen? Mail naar <a href="mailto:hanssenscornerstone@outlook.com">hanssenscornerstone@outlook.com</a>.
              </p>
            </section>
          </>
        ) : null}

        {tab === "account" ? <Account g={g} loguit={() => void loguit()} /> : null}
      </main>
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
