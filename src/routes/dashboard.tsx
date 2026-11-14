import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";

import { Meldingen } from "@/components/dash/meldingen";
import { ContactKnoppen, KanaalLabel } from "@/components/dash/contact-knoppen";
import { Automatisch } from "@/components/dash/automatisch";
import { Betalingen } from "@/components/dash/betalingen";
import { Installeren } from "@/components/dash/installeren";
import { MijnWebsite } from "@/components/dash/mijn-website";
import { Kanalen } from "@/components/dash/kanalen";
import { Reviews } from "@/components/dash/reviews";
import { Account } from "@/components/dash/account";
import { Agenda } from "@/components/dash/agenda";
import { BillingButton } from "@/components/dash/billing-button";
import { Upsell } from "@/components/dash/upsell";
import { OntwerpEditor } from "@/components/dash/ontwerp";
import { Website } from "@/components/dash/website";
import { WebsiteAanvraag } from "@/components/dash/website-aanvraag";
import { Gesprekken } from "@/components/dash/gesprekken";
import { Vandaag } from "@/components/dash/vandaag";
import { MijnChat } from "@/components/dash/mijn-chat";
import { Overview } from "@/components/dash/overview";
import { TeamChat } from "@/components/dash/team-chat";
import { warmteKlasse } from "@/components/dash/util";
import { VolgoMark } from "@/components/volgo/logo";
import { archiveerLead, haalDashboard, startBetaling, uitloggen, verwijderLead, zetLeadStatus } from "@/lib/api/account.functions";
import { SwipeRij } from "@/components/dash/swipe-rij";
import { isAdmin } from "@/lib/api/admin.functions";
import { PlanCall } from "@/components/dash/plan-call";
import { Verkeer } from "@/components/dash/verkeer";
import { ProfielFoto, ProfielKnop } from "@/components/dash/profiel";
import { ProfielSamenvatting, ProfielVragen } from "@/components/dash/profiel-vragen";
import { LeadDetail } from "@/components/dash/lead-detail";
import { haalAva } from "@/lib/api/ava.functions";
import { leesProfiel, type Profiel } from "@/lib/profiel-vragen";
import { checkNieuw } from "@/lib/api/ava.functions";
import { PLANS, PROEF_DAGEN, isPlan, type PlanId, ZICHTBAAR, aantalTekst, planTitel, vandaagTekst } from "@/lib/plans";
import "@/volgo.css";
import "@/volgo-wit.css";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const d = await haalDashboard();
    if (!d) throw redirect({ to: "/login", search: {} });
    return d;
  },
  head: () => ({ meta: [{ title: "Dashboard · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

type Tab = "home" | "aanvragen" | "gesprekken" | "agenda" | "overzicht" | "verkeer" | "ava" | "ontwerp" | "installeren" | "website" | "team" | "instellingen" | "automatisch" | "reviews" | "betalingen" | "mijnsite" | "kanalen";
type Sub = "meldingen" | "account" | "abonnement";
const SUBS: [Sub, string][] = [
  ["meldingen", "Notifications"],
  ["account", "Account"],
  ["abonnement", "Subscription"],
];
const isSub = (t: string): t is Sub => SUBS.some(([id]) => id === t);
/** Old names other parts of the app may still use. */
const ALIAS: Record<string, Tab> = { stijl: "ontwerp" };

/**
 * The sidebar. First what a business looks at every day: the inbox, the calendar, the requests. Then what Volgo does by
 * itself. Then the setup: installing Volgo in your own website, a look at that website, and the connections.
 * "Install" is hidden for customers whose website we build (Volgo is already in it); "Website" only exists for them.
 */
const ALLE_GROEPEN: { kop?: string; items: [Tab, string][] }[] = [
  {
    items: [
      ["gesprekken", "Inbox"],
      ["agenda", "Calendar"],
      ["aanvragen", "Requests"],
      ["home", "Today"],
    ],
  },
  {
    kop: "Automatic",
    items: [
      ["automatisch", "Follow-up"],
      ["reviews", "Reviews"],
      ["betalingen", "Payments"],
    ],
  },
  {
    kop: "Setup",
    items: [
      ["installeren", "Install"],
      ["website", "Website"],
      ["mijnsite", "My website"],
      ["kanalen", "Connections"],
      ["ava", "Your chat"],
    ],
  },
  {
    items: [
      ["verkeer", "Visitors"],
      ["instellingen", "Settings"],
    ],
  },
];
const groepenVoor = (metWebsite: boolean) => ALLE_GROEPEN.map((g) => ({ ...g, items: g.items.filter(([id]) => id !== (metWebsite ? "installeren" : "website")) }));
const TABS: [Tab, string][] = ALLE_GROEPEN.flatMap((g) => g.items);
type Toast = { id: number; titel: string; tekst: string; tab: Tab; heet?: boolean };
type Status = "nieuw" | "opvolging" | "offerte" | "afspraak" | "klant" | "verloren";
const STATUS_LABEL: Record<Status, string> = {
  nieuw: "New",
  opvolging: "Volgo follows up",
  offerte: "Quote",
  afspraak: "Appointment",
  klant: "Customer",
  verloren: "Lost",
};

const datum = (iso: string) =>
  new Date(iso.replace(" ", "T") + "Z").toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

function Icon({ name }: { name: Tab | "uit" | "meer" | "abonnement" | "account" }) {
  const d: Record<string, string> = {
    home: "M10 3.5l1.6 4.1 4.4.3-3.4 2.8 1.1 4.3L10 12.6 6.3 15l1.1-4.3L4 7.9l4.4-.3z",
    website: "M3 4.5h14v11H3zM3 7.5h14M6 6h.01M8 6h.01",
    ontwerp: "M4 16l3.5-1 8.3-8.3a1.6 1.6 0 0 0-2.3-2.3L5.2 12.7zM12.5 5.5l2.3 2.3",
    instellingen: "M10 7.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM10 2.5l1.3 2 2.3-.6.6 2.3 2.2 1-1 2.2 1 2.2-2.2 1-.6 2.3-2.3-.6-1.3 2-1.3-2-2.3.6-.6-2.3-2.2-1 1-2.2-1-2.2 2.2-1 .6-2.3 2.3.6z",
    meer: "M4.5 10h.01M10 10h.01M15.5 10h.01",
    overzicht: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z",
    verkeer: "M3 16.5h14M5 13.5V10M9 13.5V6M13 13.5V8.5M17 13.5V4",
    agenda: "M3.5 5.5h13v11h-13zM3.5 8.5h13M7 3.5v3M13 3.5v3",
    gesprekken: "M3.5 4.5h13v9h-6l-4 3v-3h-3z",
    ava: "M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM7.6 9h.01M12.4 9h.01M7.8 11.8c1.2 1 3.2 1 4.4 0",
    team: "M4 5.5h12v8H9l-3.5 3v-3H4z",
    aanvragen: "M3 5h14M3 10h14M3 15h9",
    abonnement: "M3 6h14v9H3zM3 9h14",
    account: "M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.5 17.5c.8-3 3.4-4.8 6.5-4.8s5.7 1.8 6.5 4.8",
    automatisch: "M11 2.5 4.5 11H10l-1 6.5L15.5 9H10z",
    reviews: "M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.8 5.8 16l.8-4.7L3.2 8l4.7-.7z",
    betalingen: "M3 5.5h14v9H3zM3 8.5h14M6 12h3",
    mijnsite: "M3 4.5h14v11H3zM3 7.5h14M6 6h.01M8 6h.01",
    kanalen: "M4 5h12v8H9l-4 3v-3H4zM15 9h1.5",
    installeren: "M7 6.5 3.5 10 7 13.5M13 6.5l3.5 3.5-3.5 3.5M11.3 4.5 8.7 15.5",
    uit: "M8 4H4v12h4M12 6.5 15.5 10 12 13.5M15.5 10H8",
  };
  return (
    <svg aria-hidden="true" className="v-dash__icon" viewBox="0 0 20 20">
      <path d={d[name]} />
    </svg>
  );
}

function Dashboard() {
  const d = Route.useLoaderData();
  if ("geblokkeerd" in d) return <Vergrendeld eigenaar={d.eigenaar ?? true} naam={d.naam ?? ""} nieuw={d.nieuw ?? false} />;
  return <Open data={d as DashData} />;
}

/**
 * No plan yet (or it ended): you see your dashboard, but everything is locked until you start a plan.
 * The four things that are sold are listed here; the button goes straight to the secure payment page.
 */
function Vergrendeld({ naam, nieuw, eigenaar }: { naam: string; nieuw: boolean; eigenaar: boolean }) {
  const [kies, setKies] = useState<PlanId>("groei");
  const GROEPEN = groepenVoor(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const navigate = useNavigate();
  const start = async () => {
    setBezig(true);
    setFout("");
    const r = await startBetaling({ data: { plan: kies } }).catch(() => ({ ok: false as const, message: "Something went wrong. Please try again." }));
    if (r.ok) {
      window.location.href = r.url;
      return;
    }
    setFout(r.message);
    setBezig(false);
  };
  const uit = async () => {
    await uitloggen();
    void navigate({ to: "/" });
  };
  const gekozen = PLANS[kies];
  return (
    <div className="volgo vn v-lock">
      <aside className="v-lock__side">
        <a className="v-lock__logo" href="/">
          <VolgoMark />
          <span>Volgo</span>
        </a>
        {GROEPEN.map((gr, i) => (
          <div className="v-lock__groep" key={i}>
            {gr.kop ? <small>{gr.kop}</small> : null}
            {gr.items.map(([id, label]) => (
              <span className="v-lock__item" key={id}>
                <Icon name={id} />
                {label}
                <svg aria-hidden="true" className="v-lock__slot" viewBox="0 0 20 20">
                  <path d="M6 9V6.5a4 4 0 0 1 8 0V9M5 9h10v8H5z" />
                </svg>
              </span>
            ))}
          </div>
        ))}
        <button className="v-lock__uit" onClick={() => void uit()} type="button">
          Log out
        </button>
      </aside>
      <main className="v-lock__main">
        <section aria-labelledby="lock-titel" className="v-lock__kaart">
          <p className="v-lock__hoi">Welcome{naam ? `, ${naam.split(" ")[0]}` : ""}</p>
          <h1 id="lock-titel">{nieuw ? "Choose a plan to open your dashboard." : "Choose a plan to continue."}</h1>
          <p className="v-lock__sub">
            {nieuw
              ? "Your dashboard is ready, but still locked. Pay securely via Stripe. Your dashboard opens right after, and takes you step by step through putting Volgo on your website."
              : "Your subscription has ended. All your data is still here. Start a plan to open your dashboard again."}
          </p>
          {eigenaar ? (
            <>
              <div className="v-lock__plannen" role="radiogroup">
                {ZICHTBAAR.map((id) => {
                  const p = PLANS[id];
                  return (
                    <button aria-checked={kies === id} className={`v-lock__plan${kies === id ? " is-aan" : ""}`} key={id} onClick={() => setKies(id)} role="radio" type="button">
                      <span className="v-lock__plannaam">
                        {p.naam}
                        {p.badge ? <em>{p.badge}</em> : null}
                      </span>
                      <b>€{p.opstart ? p.opstart / 100 : p.prijsTekst}</b>
                      <span className="v-lock__per">{p.opstart ? `one-time + €${p.prijsTekst} per month` : "per month"}</span>
                      <ul>
                        {p.kern.map((k) => (
                          <li key={k}>{k}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
              {fout ? (
                <p className="v-err" role="alert">
                  {fout}
                </p>
              ) : null}
              <div className="v-lock__voet">
                <p>
                  {gekozen.opstart
                    ? `Today ${vandaagTekst(gekozen)}: your website and the first month. After that €${gekozen.prijsTekst} per month. Excl. VAT, cancel any month.`
                    : `€${gekozen.prijsTekst} per month for ${planTitel(gekozen)}, excl. VAT. Cancel any month. Secure payment via Stripe.`}{" "}
                  <a href="/pricing">Compare the plans</a>
                </p>
                <button className="v-lock__knop" disabled={bezig} onClick={() => void start()} type="button">
                  {bezig ? "One moment…" : `Start ${planTitel(gekozen)} →`}
                </button>
              </div>
            </>
          ) : (
            <p className="v-lock__sub">Only the account owner can start a plan. Ask them to log in and choose one.</p>
          )}
        </section>
      </main>
    </div>
  );
}

type DashData = Exclude<NonNullable<Awaited<ReturnType<typeof haalDashboard>>>, { geblokkeerd: true }>;

function Open({ data }: { data: DashData }) {
  const { gebruiker: g } = data;
  const leads = [...data.leads].sort((a, b) => {
    const af = (x: typeof a) => (x.status === "klant" || x.status === "verloren" ? 1 : 0);
    return af(a) - af(b) || b.warmte - a.warmte;
  });
  const router = useRouter();
  const navigate = useNavigate();
  const metWebsite = (isPlan(g.plan) ? PLANS[g.plan] : PLANS.start).limieten.website;
  const [geinstalleerd, setGeinstalleerd] = useState(data.geinstalleerd || metWebsite);
  // You open on your inbox. Until Volgo is on your website, you open on the steps to put it there.
  const begin: Tab = geinstalleerd ? "gesprekken" : "installeren";
  const [tab, setTabRaw] = useState<Tab>(begin);
  const [sub, setSub] = useState<Sub>("account");
  const vorige = useRef<Tab>(begin);
  const [meer, setMeer] = useState(false);
  const [admin, setAdmin] = useState(false);
  // The five profile questions: once for the owner before the dashboard, later changeable on the Train Volgo page.
  const [vragenOpen, setVragenOpen] = useState(false);
  const [leadFilter, setLeadFilter] = useState<"alle" | "nieuw" | "heet" | "open" | "klaar" | "archief">("alle");
  const [ongedaan, setOngedaan] = useState<{ id: number; naam: string } | null>(null);
  const [leadZoek, setLeadZoek] = useState("");
  const [leadOpen, setLeadOpen] = useState<number | null>(null);
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  useEffect(() => {
    if (tab !== "ava") return;
    void haalAva()
      .then((a) => setProfiel(leesProfiel(a.inst.profiel)))
      .catch(() => setProfiel({}));
  }, [tab, vragenOpen]);
  // Light or dark: remembered per device. Light (white, like the public pages) is the default.
  const [thema, setThema] = useState<"licht" | "donker">("licht");
  useEffect(() => {
    let t: string | null = null;
    try {
      t = localStorage.getItem("volgo-thema");
    } catch {
      /* private mode */
    }
    setThema(t === "donker" ? "donker" : "licht");
  }, []);
  useEffect(() => {
    document.documentElement.style.colorScheme = thema === "donker" ? "dark" : "light";
    document.documentElement.dataset.thema = thema;
    return () => {
      document.documentElement.style.colorScheme = "";
      delete document.documentElement.dataset.thema;
    };
  }, [thema]);
  const wisselThema = () => {
    const n = thema === "donker" ? "licht" : "donker";
    setThema(n);
    try {
      localStorage.setItem("volgo-thema", n);
    } catch {
      /* private mode */
    }
  };
  // A soft ripple where you click a button: feedback that feels alive, without being loud.
  const rimpel = (e: RPointerEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("button, .v-dash a");
    if (!el || el.closest(".v-rimpel-uit")) return;
    const r = el.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2;
    const g = document.createElement("span");
    g.className = "v-rimpel";
    g.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.overflow = "hidden";
    el.appendChild(g);
    window.setTimeout(() => g.remove(), 650);
  };
  useEffect(() => {
    void isAdmin().then(setAdmin).catch(() => setAdmin(false));
  }, []);
  /** Go to a tab; settings pages ("ava", "account", …) open inside Settings. */
  const setTab = (t: string) => {
    const doel = ALIAS[t] ?? t;
    if (isSub(doel)) {
      setSub(doel);
      setTabRaw("instellingen");
    } else {
      if (doel !== "ontwerp") vorige.current = doel as Tab;
      setTabRaw(doel as Tab);
    }
    setMeer(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };
  // A push notification opens /dashboard#agenda etc.: go straight to that tab.
  useEffect(() => {
    const ga = () => {
      const h = window.location.hash.slice(1);
      if (["home", "gesprekken", "agenda", "aanvragen", "betalingen", "automatisch", "reviews", "verkeer", "installeren", "mijnsite", "website", "kanalen", "ava", "instellingen", "meldingen", "account", "abonnement"].includes(h)) setTab(h);
    };
    ga();
    window.addEventListener("hashchange", ga);
    return () => window.removeEventListener("hashchange", ga);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sinds = useRef(data.nu.slice(0, 19).replace("T", " "));

  // Meldingen: elke 15 seconden kijken of er nieuwe gesprekken of leads zijn.
  useEffect(() => {
    const id = window.setInterval(async () => {
      const r = await checkNieuw({ data: { sinds: sinds.current } }).catch(() => null);
      if (!r) return;
      sinds.current = r.nu;
      const nieuw: Toast[] = [];
      if (r.meldChat) for (const c of r.chats) nieuw.push({ id: Math.random(), titel: "New conversation with Volgo", tekst: c.onderwerp, tab: "gesprekken" });
      if (r.meldLead) for (const l of r.leads) nieuw.push({ id: Math.random(), titel: `New request: ${l.naam}`, tekst: `Warmth ${l.warmte} · ${l.onderwerp}`, tab: "aanvragen", heet: l.warmte >= 75 });
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
    }, 8000);
    return () => window.clearInterval(id);
  }, [router]);
  const plan = isPlan(g.plan) ? PLANS[g.plan] : PLANS.start;
  const GROEPEN = groepenVoor(plan.limieten.website);
  const vol = plan.limieten.gesprekken !== null && data.gebruik.gesprekken >= plan.limieten.gesprekken;
  const voornaam = g.naam.split(/\s+/)[0];
  const proefDagen = g.proef_tot ? Math.max(0, Math.ceil((new Date(g.proef_tot.replace(" ", "T") + "Z").getTime() - Date.now()) / 86400000)) : 0;

  async function archiveer(id: number, naam: string, aan: boolean) {
    await archiveerLead({ data: { id, aan } });
    setOngedaan(aan ? { id, naam } : null);
    await router.invalidate();
  }
  async function wis(id: number, naam: string) {
    if (!window.confirm(`Delete the request from ${naam} for good? The conversation stays in your inbox.`)) return;
    await verwijderLead({ data: { id } });
    if (leadOpen === id) setLeadOpen(null);
    await router.invalidate();
  }
  useEffect(() => {
    if (!ongedaan) return;
    const t = setTimeout(() => setOngedaan(null), 6000);
    return () => clearTimeout(t);
  }, [ongedaan]);

  async function zetStatus(id: number, status: Status) {
    await zetLeadStatus({ data: { id, status } });
    await router.invalidate();
  }
  async function loguit() {
    await uitloggen();
    void navigate({ to: "/login", search: {} });
  }

  const nieuweLeads = leads.filter((l) => l.status === "nieuw").length;
  // Mobile: four main tabs at the bottom, the rest grouped under "More".
  const mobiel: [Tab, string][] = [
    ["gesprekken", "Inbox"],
    ["agenda", "Calendar"],
    ["aanvragen", "Requests"],
    ["home", "Today"],
  ];

  // First login of the owner: answer the five questions before anything else.
  if ((g.rol === "eigenaar" && !data.profielKlaar) || vragenOpen)
    return (
      <div className="volgo v-dash v-dash--editor" data-thema={thema}>
        <ProfielVragen
          annuleer={vragenOpen && data.profielKlaar ? () => setVragenOpen(false) : undefined}
          bedrijf={g.bedrijf}
          klaar={async () => {
            setVragenOpen(false);
            await router.invalidate();
          }}
          start={vragenOpen ? (profiel ?? {}) : {}}
        />
      </div>
    );

  // Right after the five questions: set the business number and see which channels really work.
  if (g.rol === "eigenaar" && data.profielKlaar && !data.kanalenGezien)
    return (
      <div className="volgo v-dash v-dash--editor" data-thema={thema}>
        <Kanalen
          klaar={async () => {
            // A new account goes straight to the one thing left to do: put Volgo on their own website.
            setTab(metWebsite ? "website" : "installeren");
            await router.invalidate();
          }}
          onboarding
        />
      </div>
    );

  // Customize: a full-screen editor, like Shopify's theme editor.
  if (tab === "ontwerp")
    return (
      <div className="volgo v-dash v-dash--editor" data-thema={thema}>
        <OntwerpEditor terug={() => setTab(vorige.current)} />
      </div>
    );

  return (
    <div className="volgo v-dash" data-thema={thema} onPointerDown={rimpel}>
      <aside className="v-dash__side">
        <button aria-label="Volgo, to your inbox" className="v-nav__brand v-dash__brand" onClick={() => setTab("gesprekken")} type="button">
          <VolgoMark />
          <span>Volgo</span>
        </button>
        <nav aria-label="Dashboard" className="v-dash__nav">
          {GROEPEN.map((groep, gi) => (
            <div className="v-dash__groep" key={groep.kop ?? gi}>
              {groep.kop ? <p className="v-dash__kop">{groep.kop}</p> : null}
              {groep.items.map(([id, label]) => (
                <button aria-current={tab === id ? "page" : undefined} key={id} onClick={() => setTab(id)} type="button">
                  <Icon name={id} />
                  {label}
                  {id === "aanvragen" && nieuweLeads > 0 ? <span className="v-dash__badge">{nieuweLeads}</span> : null}
                  {id === "installeren" && !geinstalleerd ? <span className="v-dash__badge v-dash__badge--doen">To do</span> : null}
                </button>
              ))}
            </div>
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
        <button aria-label={thema === "donker" ? "Switch to light" : "Switch to dark"} className="v-thema v-rimpel-uit" onClick={wisselThema} title={thema === "donker" ? "Light" : "Dark"} type="button">
          <span className="v-thema__zon" aria-hidden="true">
            <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </span>
          <span className="v-thema__maan" aria-hidden="true">
            <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
            </svg>
          </span>
        </button>
        <ProfielKnop admin={admin} g={g} loguit={() => void loguit()} openTab={(t) => setTab(t)} planCall={plan.limieten.website} planNaam={plan.naam} />
      </div>
      <main key={tab === "instellingen" ? `${tab}-${sub}` : tab} className={`v-dash__main${(tab === "team" && plan.limieten.teamChat) || (tab === "website" && plan.id !== "compleet") ? " v-dash__main--full" : ""}`}>
        {g.status === "proef" && proefDagen > 0 ? (
          <p className="v-dash__banner">
            {proefDagen > PROEF_DAGEN
              ? `You're one of our first customers: free access, ${proefDagen} days left. Nothing is charged automatically. After that you choose whether to continue.`
              : `Your trial has ${proefDagen} ${proefDagen === 1 ? "day" : "days"} left. After that, Volgo ${plan.naam} continues automatically at €${plan.prijsTekst} per month.`}
          </p>
        ) : null}

        {!geinstalleerd && tab !== "installeren" && g.rol === "eigenaar" ? (
          <button className="v-dash__doen" onClick={() => setTab("installeren")} type="button">
            <span>
              <strong>Volgo is not on your website yet.</strong> It takes about 10 minutes, step by step.
            </span>
            <em>Install now →</em>
          </button>
        ) : null}

        {tab === "home" ? <Vandaag data={data} openTab={(t) => setTab(t)} voornaam={voornaam} /> : null}
        {tab === "overzicht" ? <Overview data={data} openTab={(t) => setTab(t)} voornaam={voornaam} /> : null}
        {tab === "verkeer" ? <Verkeer openTab={(t) => setTab(t)} /> : null}
        {tab === "gesprekken" ? <Gesprekken data={data} /> : null}
        {tab === "agenda" ? <Agenda data={data} /> : null}
        {tab === "website" && plan.limieten.website ? plan.id === "compleet" ? <WebsiteAanvraag openTab={(t) => setTab(t)} /> : <Website /> : null}
        {tab === "ava" ? <MijnChat /> : null}
        {tab === "automatisch" ? <Automatisch openTab={(t) => setTab(t)} /> : null}
        {tab === "reviews" ? <Reviews openTab={(t) => setTab(t)} /> : null}
        {tab === "betalingen" ? <Betalingen /> : null}
        {tab === "installeren" ? <Installeren klaar={() => setGeinstalleerd(true)} openTab={(t) => setTab(t)} wijDoenHet={plan.id !== "starter"} /> : null}
        {tab === "mijnsite" ? <MijnWebsite gebouwd={plan.limieten.website} openTab={(t) => setTab(t)} /> : null}
        {tab === "kanalen" ? <Kanalen openTab={(t) => setTab(t)} /> : null}
        {tab === "team" ? (
          plan.limieten.teamChat ? (
            <TeamChat data={data} />
          ) : (
            <Upsell
              knop="See the plans"
              punten={["Channels and private messages", "Video calls with one click", "Up to 5 team members on Growth, unlimited on Pro"]}
              tag="Growth"
              tekst="Bring your team into Volgo. Talk about requests, share updates and start a video call without leaving your dashboard."
              titel="Team chat and video calls"
            />
          )
        ) : null}

        {tab === "aanvragen" ? (
          <>
            <header className="v-dash__head">
              <h1>Requests</h1>
              <p>Warmest first. Change the status once you have been in touch, so your team sees where every request stands.</p>
            </header>
            {(() => {
              const open = (l: (typeof leads)[number]) => l.status !== "klant" && l.status !== "verloren";
              const tellingen = {
                alle: leads.length,
                nieuw: leads.filter((l) => l.status === "nieuw").length,
                heet: leads.filter((l) => l.warmte >= 75 && open(l)).length,
                open: leads.filter(open).length,
                klaar: leads.filter((l) => !open(l)).length,
                archief: data.archief.length,
              };
              const z = leadZoek.trim().toLowerCase();
              const lijst = (leadFilter === "archief" ? data.archief : leads).filter((l) => {
                if (leadFilter === "nieuw" && l.status !== "nieuw") return false;
                if (leadFilter === "heet" && !(l.warmte >= 75 && open(l))) return false;
                if (leadFilter === "open" && !open(l)) return false;
                if (leadFilter === "klaar" && open(l)) return false;
                if (z && !`${l.naam} ${l.onderwerp} ${l.reden ?? ""} ${l.herkomst ?? ""}`.toLowerCase().includes(z)) return false;
                return true;
              });
              const FILTERS: [typeof leadFilter, string][] = [
                ["alle", "All"],
                ["nieuw", "New"],
                ["heet", "Hot"],
                ["open", "In progress"],
                ["klaar", "Won / lost"],
                ["archief", "Archive"],
              ];
              return (
                <>
                  <div className="v-leadbalk">
                    <div className="v-instel__nav v-leadbalk__filters" role="tablist" aria-label="Filter requests">
                      {FILTERS.map(([id, label]) => (
                        <button aria-current={leadFilter === id ? "page" : undefined} key={id} onClick={() => setLeadFilter(id)} type="button">
                          {label} <span className="v-leadbalk__n">{tellingen[id]}</span>
                        </button>
                      ))}
                    </div>
                    <input aria-label="Search requests" className="v-leadbalk__zoek" onChange={(e) => setLeadZoek(e.target.value)} placeholder="Search by name, subject or place" type="search" value={leadZoek} />
                  </div>
                  <section className="v-dash__panel v-dash__panel--flush">
                    <div className="v-table" role="table">
                      <div className="v-table__row v-table__row--head" role="row">
                        <span role="columnheader">Warmth</span>
                        <span role="columnheader">Customer</span>
                        <span role="columnheader">Via</span>
                        <span role="columnheader">Received</span>
                        <span role="columnheader">Status</span>
                      </div>
                      {leadFilter === "archief" && data.archief.length === 0 ? (
                        <p className="v-feed__empty v-pad">Nothing archived yet. Swipe a request to the left (or click the archive button) to put it here.</p>
                      ) : leadFilter !== "archief" && leads.length === 0 ? (
                        <p className="v-feed__empty v-pad">No requests yet. As soon as a visitor leaves their details with Volgo, they show up here, warmest first.</p>
                      ) : lijst.length === 0 ? (
                        <p className="v-feed__empty v-pad">Nothing found with this filter.</p>
                      ) : null}
                      {lijst.map((l) => (
                        <SwipeRij
                          acties={
                            leadFilter === "archief"
                              ? [
                                  { label: "Restore", icoon: "terug", kleur: "groen", doe: () => void archiveer(l.id, l.naam, false) },
                                  { label: "Delete", icoon: "wis", kleur: "rood", doe: () => void wis(l.id, l.naam) },
                                ]
                              : [
                                  { label: "Archive", icoon: "archief", kleur: "grijs", doe: () => void archiveer(l.id, l.naam, true) },
                                  { label: "Delete", icoon: "wis", kleur: "rood", doe: () => void wis(l.id, l.naam) },
                                ]
                          }
                          key={l.id}
                        >
                        <div
                          className={`v-table__row v-table__row--klik${l.warmte >= 75 && open(l) ? " is-heet" : ""}`}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("select")) return;
                            setLeadOpen(l.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !(e.target as HTMLElement).closest("select")) setLeadOpen(l.id);
                          }}
                          role="row"
                          tabIndex={0}
                        >
                          <span role="cell">
                            <span className={`v-heat v-heat--${warmteKlasse(l.warmte)}`} title={l.reden ?? ""}>
                              {l.warmte}
                            </span>
                          </span>
                          <span role="cell">
                            <strong>{l.naam}</strong>
                            <small>{l.reden || l.onderwerp}</small>
                            {l.contact ? <small className="v-lead__contact">{l.contact}</small> : null}
                            {l.herkomst ? <small className="v-herkomst">📍 {l.herkomst}</small> : null}
                            <ContactKnoppen contact={l.contact} kanaal={l.kanaal} klein naam={l.naam} onderwerp={l.onderwerp} />
                          </span>
                          <span role="cell">
                            <KanaalLabel kanaal={l.kanaal} />
                          </span>
                          <span role="cell">{datum(l.created_at)}</span>
                          <span role="cell">
                            <select aria-label={`Status of ${l.naam}`} className={`v-select v-pill--${l.status}`} onChange={(e) => void zetStatus(l.id, e.target.value as Status)} value={l.status}>
                              {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                                <option key={st} value={st}>
                                  {STATUS_LABEL[st]}
                                </option>
                              ))}
                            </select>
                          </span>
                        </div>
                        </SwipeRij>
                      ))}
                    </div>
                  </section>
                </>
              );
            })()}
          </>
        ) : null}

        {tab === "instellingen" ? (
          <>
            <header className="v-dash__head">
              <h1>Settings</h1>
              <p>Notifications, your account and your subscription.</p>
            </header>
            <nav aria-label="Settings" className="v-instel__nav">
              {SUBS.map(([id, label]) => (
                <button aria-current={sub === id ? "page" : undefined} key={id} onClick={() => setSub(id)} type="button">
                  {label}
                </button>
              ))}
            </nav>
            
            {sub === "meldingen" ? <Meldingen /> : null}
            {sub === "account" ? <Account g={g} leden={data.leden} loguit={() => void loguit()} openTab={(t) => setTab(t)} planNaam={plan.naam} /> : null}
            {sub === "abonnement" ? (
              <>
            {plan.limieten.website ? (
              <section className="v-dash__panel">
                <PlanCall />
              </section>
            ) : null}
            <section className="v-dash__panel v-plan-card">
              <p className="v-plan-card__name">{planTitel(plan)}</p>
              <p className="v-plan-card__price">€{plan.prijsTekst} <span>per month, excl. VAT</span></p>
              <p className="v-plan-card__state">
                {g.status === "proef" ? `Trial, ${proefDagen} ${proefDagen === 1 ? "day" : "days"} left` : "Active"}
                {g.testmodus ? " · test account" : ""}
              </p>
              <div className="v-meter">
                <div className="v-meter__kop">
                  <span>Conversations this month</span>
                  <strong>
                    {aantalTekst(data.gebruik.gesprekken)} / {aantalTekst(plan.limieten.gesprekken)}
                  </strong>
                </div>
                <div aria-hidden="true" className="v-meter__balk">
                  <i
                    className={vol ? "is-vol" : ""}
                    style={{ width: `${plan.limieten.gesprekken === null ? 0 : Math.min(100, (data.gebruik.gesprekken / plan.limieten.gesprekken) * 100)}%` }}
                  />
                </div>
                {vol ? (
                  <p className="v-small">
                    You reached this month's number. Volgo keeps catching requests in a simple mode. <a href="/pricing">Upgrade</a> for full answers again.
                  </p>
                ) : null}
              </div>
              <ul className="v-plan__list">
                {[...plan.kern, ...plan.features].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {g.rol === "eigenaar" ? (
                <>
                  <BillingButton />
                  {plan.verborgen ? null : (
                    <a className="v-plan-card__wissel" href="/pricing">
                      Compare plans or switch
                    </a>
                  )}
                </>
              ) : (
                <p className="v-plan-card__help">Only the account owner can manage the subscription.</p>
              )}
            </section>
              </>
            ) : null}
          </>
        ) : null}
      </main>
      <nav aria-label="Main menu" className="v-mnav">
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
            {GROEPEN.filter((gr) => gr.items.some(([id]) => !mobiel.some(([m]) => m === id))).map((groep) => (
              <div className="v-sheet__groep" key={groep.kop ?? "jij"}>
                <p className="v-sheet__kop">{groep.kop ?? "More"}</p>
                {groep.items.filter(([id]) => !mobiel.some(([m]) => m === id)).map(([id]) => (
                  <button key={id} onClick={() => setTab(id)} type="button">
                    <Icon name={id} />
                    {TABS.find((t) => t[0] === id)?.[1]}
                  </button>
                ))}
                {groep.items.some(([id]) => id === "instellingen") ? (
                  <button onClick={() => setTab("abonnement")} type="button">
                    <Icon name="abonnement" />
                    Subscription
                  </button>
                ) : null}
              </div>
            ))}
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
      {ongedaan ? (
        <div className="v-ongedaan" role="status">
          <span>Request from {ongedaan.naam} archived</span>
          <button onClick={() => void archiveer(ongedaan.id, ongedaan.naam, false)} type="button">
            Undo
          </button>
        </div>
      ) : null}
      {leadOpen !== null ? (
        <LeadDetail
          id={leadOpen}
          openChats={() => {
            setLeadOpen(null);
            setTab("gesprekken");
          }}
          sluit={() => setLeadOpen(null)}
          zetStatus={zetStatus}
        />
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
