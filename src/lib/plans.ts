// Plans. Amounts in cents, per month, excl. VAT. Limits are enforced in the app.
// Volgo is an appointment setter that goes into the customer's own website: visitors plan an appointment, everything lands in
// one inbox and Volgo follows up by itself. Three plans for a website you already have (Starter, Growth, Pro) and one package
// where we build the whole website with Volgo inside (Complete).
// "start", "pro" and "premium" are earlier plans: no longer sold, existing customers keep them unchanged.
export type PlanId = "starter" | "groei" | "max" | "compleet" | "start" | "pro" | "premium";

/** Every plan starts with a short trial: you pay PROEF_PRIJS (cents) today, the full monthly price after PROEF_DAGEN days. */
export const PROEF_DAGEN = 7;
export const PROEF_PRIJS = 100;

export type Plan = {
  id: PlanId;
  naam: string;
  prijs: number;
  prijsTekst: string;
  proefDagen: number;
  tagline: string;
  badge?: string;
  /** One-time price of the website in cents, charged with the first payment (0 = none). */
  opstart: number;
  /** Introductory offer for first-time customers: this price (cents) for the first `maanden` months, then `prijs`. */
  intro?: { maanden: number; prijs: number; prijsTekst: string };
  /** Old plan, still valid for existing customers but no longer sold. */
  verborgen?: boolean;
  /** For whom this plan is, in one line. */
  voor: string;
  /** Headline limits, shown first on the plan card (like "300 gesprekken per maand"). */
  kern: string[];
  features: string[];
  limieten: {
    /** Max people on the account, including the owner. null = unlimited. */
    leden: number | null;
    teamChat: boolean;
    /** Own photo and style for the chat, no "Volgo" mention. */
    eigenStijl: boolean;
    /** Volgo builds a custom website with Volgo built in (domain not included). */
    website: boolean;
    /** AI conversations per calendar month. Above this, Volgo still captures leads in basic mode. null = unlimited. */
    gesprekken: number | null;
    /** Longest analytics range in days. */
    analyticsDagen: number;
  };
};

/** Old website packages (sold 13 Nov 2026): the website was built by Volgo, with Volgo inside. No longer sold; existing customers keep them. */
const WEBSITE_LIMIETEN: Plan["limieten"] = { leden: 5, teamChat: true, eigenStijl: true, website: true, gesprekken: 3000, analyticsDagen: 90 };


/** What every plan does. The plans differ in volume, users and how much we do for you. */
const BASIS = [
  "Volgo answers every visitor, day and night",
  "Visitors book an appointment themselves, in your website",
  "Everything in one inbox",
  "Automatic follow-up after 1 and 3 days",
  "Confirmation right away, reminder the day before",
];

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    naam: "Starter",
    prijs: 14900,
    prijsTekst: "149",
    proefDagen: 0,
    opstart: 0,
    voor: "For owners who work alone and handle their own appointments.",
    tagline: "Volgo in the website you already have. Visitors book an appointment themselves, you see everything in one inbox.",
    kern: ["300 conversations per month", "2 team members", "Install it yourself in about 10 minutes"],
    features: [...BASIS, "Your own questions, opening hours and appointment length", "Your own chat name, photo and colour", "30 days of visitor analytics", "Email support"],
    limieten: { leden: 2, teamChat: false, eigenStijl: false, website: false, gesprekken: 300, analyticsDagen: 30 },
  },
  groei: {
    id: "groei",
    naam: "Growth",
    prijs: 24900,
    prijsTekst: "249",
    proefDagen: 0,
    opstart: 0,
    badge: "Most popular",
    voor: "For businesses with a small team and new requests every week.",
    tagline: "More conversations, your team on board and the chat fully in your own style, without the Volgo name.",
    kern: ["1,000 conversations per month", "5 team members", "We install it for you, if you like"],
    features: ["Everything in Starter", "Chat fully in your own style, without the Volgo name", "Team chat: discuss a request with colleagues", "90 days of visitor analytics", "Priority email support"],
    limieten: { leden: 5, teamChat: true, eigenStijl: true, website: false, gesprekken: 1000, analyticsDagen: 90 },
  },
  max: {
    id: "max",
    naam: "Pro",
    prijs: 44900,
    prijsTekst: "449",
    proefDagen: 0,
    opstart: 0,
    voor: "For busy businesses with many visitors and a bigger team.",
    tagline: "Everything in Growth, for many visitors and a bigger team. We set it all up for you.",
    kern: ["5,000 conversations per month", "Unlimited team members", "We install it and set it up for you"],
    features: ["Everything in Growth", "We put Volgo in your website and set up your questions and hours", "Personal help with your setup", "90 days of visitor analytics"],
    limieten: { leden: null, teamChat: true, eigenStijl: true, website: false, gesprekken: 5000, analyticsDagen: 90 },
  },
  compleet: {
    id: "compleet",
    naam: "Complete",
    prijs: 24999,
    prijsTekst: "249.99",
    proefDagen: 0,
    opstart: 249900,
    voor: "For businesses without a website, or ready for a new one.",
    tagline: "We build your complete website, with Volgo inside and your domain included. Everything unlimited.",
    kern: ["Complete website, built for you", "Volgo inside, everything unlimited", "Your domain included"],
    features: [
      "A website made to measure, with your own photos and texts",
      "Your domain name arranged and included",
      "Volgo is in it from day one: nothing to install",
      "Unlimited conversations and team members",
      "Everything in Pro",
      "Changes to your website when you need them",
    ],
    limieten: { leden: null, teamChat: true, eigenStijl: true, website: true, gesprekken: null, analyticsDagen: 90 },
  },
  start: {
    id: "start",
    naam: "Volgo",
    prijs: 4999,
    prijsTekst: "49,99",
    proefDagen: 0,
    opstart: 0,
    verborgen: true,
    voor: "",
    tagline: "The appointment setter inside your own website. It answers every visitor, asks your questions and books the appointment. Paste one line of code and it works.",
    kern: ["Appointment setter in your own website", "Paste one line of code, done", "Every appointment in one calendar"],
    features: [
      "Answers every visitor, day and night",
      "Asks your questions before the appointment",
      "Shows only your free times, never double booked",
      "Phone call, visit, at your office or chat appointment",
      "Confirmation right away, reminder the day before",
      "Follow-up after 1 and 3 days when someone did not book",
      "A notification on your phone for every appointment",
      "Read every chat live and take over yourself",
      "Your own chat name, photo and colour",
    ],
    // The earlier €49,99 plan: no longer sold, existing accounts keep these limits.
    limieten: { leden: 5, teamChat: true, eigenStijl: true, website: false, gesprekken: 3000, analyticsDagen: 90 },
  },
  pro: {
    id: "pro",
    naam: "Website",
    prijs: 4999,
    prijsTekst: "49,99",
    proefDagen: 0,
    opstart: 99700,
    verborgen: true,
    voor: "",
    tagline: "A professional website built for you, with Volgo inside: the assistant that answers every visitor and plans your appointments.",
    kern: ["Professional website, made to measure", "Volgo inside, 24/7", "All your customers in one app"],
    features: [
      "Website made to measure, via chat or call",
      "Photos and video on your site",
      "Volgo answers every visitor and plans the appointment",
      "Your own chat photo and style, no Volgo branding",
      "Changes to your website when you need them",
    ],
    limieten: WEBSITE_LIMIETEN,
  },
  premium: {
    id: "premium",
    naam: "3D website",
    prijs: 4999,
    prijsTekst: "49,99",
    proefDagen: 0,
    opstart: 199700,
    verborgen: true,
    voor: "",
    tagline: "A 3D website that people remember: 3D visuals and scroll animations, with Volgo inside to plan your appointments.",
    kern: ["3D website with scroll animations", "Volgo inside, 24/7", "All your customers in one app"],
    features: [
      "Everything in Website",
      "3D visuals that move as you scroll",
      "Scroll animations across the whole site",
      "Volgo answers every visitor and plans the appointment",
      "Changes to your website when you need them",
    ],
    limieten: WEBSITE_LIMIETEN,
  },
};

/** The plans for a website you already have, in the order of the price cards. */
export const ABONNEMENTEN: PlanId[] = ["starter", "groei", "max"];
/** The package where we build the website too. Shown apart from the three plans. */
export const COMPLEET: PlanId = "compleet";
/** Everything that is sold now. */
export const ZICHTBAAR: PlanId[] = [...ABONNEMENTEN, COMPLEET];

/** "Volgo Starter", "Volgo Growth", … and plain "Volgo" for the earlier plan that was simply called Volgo. */
export const planTitel = (p: Plan) => (p.naam === "Volgo" ? "Volgo" : `Volgo ${p.naam}`);

const IDS: PlanId[] = ["starter", "groei", "max", "compleet", "start", "pro", "premium"];
export const isPlan = (v: unknown): v is PlanId => typeof v === "string" && (IDS as string[]).includes(v);
export const planVan = (v: unknown): Plan => (isPlan(v) ? PLANS[v] : PLANS.start);

/** "300", "1,000" or "Unlimited". */
export const aantalTekst = (n: number | null) => (n === null ? "Unlimited" : n.toLocaleString("en-US"));
/** What you pay today: the first month, plus the one-time price of the website when there is one. "€2748.99". */
export const vandaagTekst = (p: Plan) => {
  const c = p.prijs + p.opstart;
  return `€${c % 100 ? (c / 100).toFixed(2) : c / 100}`;
};

type Cel = string | boolean;
/** Everything in the plans, as a table on the pricing page. One column per plan that is sold. */
export const VERGELIJKING: { label: string; starter: Cel; groei: Cel; max: Cel; compleet: Cel }[] = [
  { label: "Conversations per month", starter: "300", groei: "1,000", max: "5,000", compleet: "Unlimited" },
  { label: "Team members", starter: "2", groei: "5", max: "Unlimited", compleet: "Unlimited" },
  { label: "Volgo answers every visitor, 24/7", starter: true, groei: true, max: true, compleet: true },
  { label: "Visitors book an appointment themselves", starter: true, groei: true, max: true, compleet: true },
  { label: "Your questions before the appointment", starter: true, groei: true, max: true, compleet: true },
  { label: "Your opening hours and appointment length", starter: true, groei: true, max: true, compleet: true },
  { label: "Everything in one inbox", starter: true, groei: true, max: true, compleet: true },
  { label: "Confirmation and reminder", starter: true, groei: true, max: true, compleet: true },
  { label: "Automatic follow-up after 1 and 3 days", starter: true, groei: true, max: true, compleet: true },
  { label: "Notification for every appointment", starter: true, groei: true, max: true, compleet: true },
  { label: "Your own chat name, photo and colour", starter: true, groei: true, max: true, compleet: true },
  { label: "Chat in your own style, without the Volgo name", starter: false, groei: true, max: true, compleet: true },
  { label: "Team chat", starter: false, groei: true, max: true, compleet: true },
  { label: "Visitor analytics", starter: "30 days", groei: "90 days", max: "90 days", compleet: "90 days" },
  { label: "Installing", starter: "Yourself, step by step", groei: "Yourself, or we do it", max: "We do it", compleet: "Not needed" },
  { label: "A website built by us", starter: false, groei: false, max: false, compleet: true },
  { label: "Domain name", starter: false, groei: false, max: false, compleet: "Included" },
  { label: "Support", starter: "Email", groei: "Priority email", max: "Personal", compleet: "Personal" },
  { label: "Cancel", starter: "Any month", groei: "Any month", max: "Any month", compleet: "Any month" },
];

const ZELF = [
  "Pay securely, then create your account. Your dashboard opens right away.",
  "Answer 5 short questions about your business and set your opening hours.",
  "Follow the steps under Install: copy one line and paste it into your website. Your dashboard shows where, per kind of website.",
  "Press Check. Volgo looks at your website and tells you it is live. From then on appointments come in by themselves.",
];
const OUD_WEBSITE = [
  "Pay securely, then create your account. Your dashboard opens right away.",
  "Open the Website tab and tell us what you want, by chat or in a call. We build your site to measure.",
  "You review it, we launch it on your own domain with Volgo built in.",
  "Volgo is live on it from day one.",
];

/** What happens after you subscribe, per plan. Shown on the pricing page. */
export const START_STAPPEN: Record<PlanId, { titel: string; stappen: string[] }> = {
  starter: { titel: "On your website in about 10 minutes", stappen: ZELF },
  groei: { titel: "On your website in about 10 minutes", stappen: [...ZELF.slice(0, 3), "Rather not do it yourself? Press “Let Volgo do it” and we put it in your website for you."] },
  max: {
    titel: "We set it up for you",
    stappen: ["Pay securely, then create your account. Your dashboard opens right away.", "Answer 5 short questions about your business.", "We put Volgo in your website and set up your questions and hours.", "You get a message as soon as it is on. From then on appointments come in by themselves."],
  },
  compleet: {
    titel: "We build your website, with Volgo inside",
    stappen: [
      "Pay securely, then create your account. Your dashboard opens right away.",
      "Open Website and tell us what you want: your business, your photos, your texts. By chat or in a call.",
      "We build your website and arrange your domain name. You review it and approve.",
      "Your website goes live with Volgo inside. Nothing to install.",
    ],
  },
  start: { titel: "Live on your website in a few minutes", stappen: ZELF },
  pro: { titel: "We build your website with Volgo inside", stappen: OUD_WEBSITE },
  premium: { titel: "We build your 3D website with Volgo inside", stappen: OUD_WEBSITE },
};
