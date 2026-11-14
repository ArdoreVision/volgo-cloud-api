// Plans. Amounts in cents, per month, excl. VAT. Limits are enforced in the app.
// Every plan comes with a complete new website that Volgo builds automatically from what the owner tells it, with the Volgo
// appointment setter inside, on the owner's own domain. Starter, Growth and Pro get a professional website. Complete is the
// one-time package for serious businesses: a 3D website made to measure, with a 1-on-1 call and everything included.
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
    /** Volgo builds the website, with Volgo built in. True for every plan that is sold. */
    website: boolean;
    /** The website is a 3D website (3D visuals, scroll animation). Only Complete, and the earlier "3D website" package. */
    drieD?: boolean;
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
  "A complete professional website, built for you by Volgo",
  "On your own domain name",
  "Volgo answers every visitor, day and night",
  "Visitors book an appointment themselves, in your website",
  "Every chat and request in one inbox",
  "Links with your Google, Outlook or Apple Calendar",
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
    tagline: "A complete professional website, built for you, with Volgo inside. Visitors book an appointment themselves, you see everything in one inbox.",
    kern: ["Professional website, built for you", "300 conversations per month", "2 team members"],
    features: [...BASIS, "Your own questions, opening hours and appointment length", "Your own chat name, photo and colour", "Change your website by chat, whenever you want", "30 days of visitor analytics", "Email support"],
    limieten: { leden: 2, teamChat: false, eigenStijl: false, website: true, gesprekken: 300, analyticsDagen: 30 },
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
    tagline: "Your professional website with more conversations, your team on board and the chat fully in your own style, without the Volgo name.",
    kern: ["Professional website, built for you", "1,000 conversations per month", "5 team members"],
    features: ["Everything in Starter", "Chat fully in your own style, without the Volgo name", "Team chat: discuss a request with colleagues", "90 days of visitor analytics", "Priority email support"],
    limieten: { leden: 5, teamChat: true, eigenStijl: true, website: true, gesprekken: 1000, analyticsDagen: 90 },
  },
  max: {
    id: "max",
    naam: "Pro",
    prijs: 44900,
    prijsTekst: "449",
    proefDagen: 0,
    opstart: 0,
    voor: "For busy businesses with many visitors and a bigger team.",
    tagline: "Your professional website for many visitors and a bigger team. We help you set everything up.",
    kern: ["Professional website, built for you", "5,000 conversations per month", "Unlimited team members"],
    features: ["Everything in Growth", "We set up your questions and hours with you", "Personal help with your setup", "90 days of visitor analytics"],
    limieten: { leden: null, teamChat: true, eigenStijl: true, website: true, gesprekken: 5000, analyticsDagen: 90 },
  },
  compleet: {
    id: "compleet",
    naam: "Complete",
    prijs: 24999,
    prijsTekst: "249.99",
    proefDagen: 0,
    opstart: 249900,
    voor: "For serious businesses that want a website people remember.",
    tagline: "An extremely beautiful 3D website, made to measure, with Volgo inside and everything included. You get a 1-on-1 call with the founder or someone from the team.",
    kern: ["3D website, made to measure", "1-on-1 call with the founder or the team", "Everything included and unlimited"],
    features: [
      "A 3D website: 3D visuals and scroll animation, made for your business",
      "A 1-on-1 call with the founder or someone from the team",
      "Your domain name arranged and included",
      "Volgo is in it from day one",
      "Unlimited conversations and team members",
      "Everything in Pro",
      "Hosting and maintenance included in the monthly price",
      "Changes to your website when you need them",
    ],
    limieten: { leden: null, teamChat: true, eigenStijl: true, website: true, drieD: true, gesprekken: null, analyticsDagen: 90 },
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
      "Shows only your free times, also from your own linked calendar",
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
    limieten: { ...WEBSITE_LIMIETEN, drieD: true },
  },
};

/** The three monthly plans, each with a professional website, in the order of the price cards. */
export const ABONNEMENTEN: PlanId[] = ["starter", "groei", "max"];
/** The one-time package with a 3D website made to measure. Shown apart from the three plans. */
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
  { label: "Website built by Volgo", starter: "Professional", groei: "Professional", max: "Professional", compleet: "3D, made to measure" },
  { label: "Domain name", starter: "Your own, connected", groei: "Your own, connected", max: "Your own, connected", compleet: "Arranged and included" },
  { label: "Change your website by chat", starter: true, groei: true, max: true, compleet: true },
  { label: "1-on-1 call with the founder or the team", starter: false, groei: false, max: false, compleet: true },
  { label: "Conversations per month", starter: "300", groei: "1,000", max: "5,000", compleet: "Unlimited" },
  { label: "Team members", starter: "2", groei: "5", max: "Unlimited", compleet: "Unlimited" },
  { label: "Volgo answers every visitor, 24/7", starter: true, groei: true, max: true, compleet: true },
  { label: "Visitors book an appointment themselves", starter: true, groei: true, max: true, compleet: true },
  { label: "Your questions before the appointment", starter: true, groei: true, max: true, compleet: true },
  { label: "Your opening hours and appointment length", starter: true, groei: true, max: true, compleet: true },
  { label: "Every chat and request in one inbox", starter: true, groei: true, max: true, compleet: true },
  { label: "Links with your own Google, Outlook or Apple Calendar", starter: true, groei: true, max: true, compleet: true },
  { label: "Confirmation and reminder", starter: true, groei: true, max: true, compleet: true },
  { label: "Automatic follow-up after 1 and 3 days", starter: true, groei: true, max: true, compleet: true },
  { label: "Notification for every appointment", starter: true, groei: true, max: true, compleet: true },
  { label: "Your own chat name, photo and colour", starter: true, groei: true, max: true, compleet: true },
  { label: "Chat in your own style, without the Volgo name", starter: false, groei: true, max: true, compleet: true },
  { label: "Team chat", starter: false, groei: true, max: true, compleet: true },
  { label: "Visitor analytics", starter: "30 days", groei: "90 days", max: "90 days", compleet: "90 days" },
  { label: "Hosting and maintenance", starter: "Included", groei: "Included", max: "Included", compleet: "Included" },
  { label: "Support", starter: "Email", groei: "Priority email", max: "Personal", compleet: "Personal" },
  { label: "Cancel", starter: "Any month", groei: "Any month", max: "Any month", compleet: "Any month" },
];

/** After paying: tell Volgo about the business, give the domain, and Volgo builds the website. The same for the three plans. */
const NIEUW = [
  "Pay securely, then create your account.",
  "Tell Volgo about your business: what you do, your services, how customers reach you. A few minutes.",
  "Fill in your own domain name. You get the two lines to give to whoever manages it.",
  "Volgo builds your complete website, with the appointment setter inside. You look at it, change what you want by chat and press Publish.",
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
  starter: { titel: "Your website, built in minutes", stappen: NIEUW },
  groei: { titel: "Your website, built in minutes", stappen: NIEUW },
  max: { titel: "Your website, built in minutes", stappen: [...NIEUW.slice(0, 3), "Volgo builds your complete website. We help you set up your questions and hours, then you press Publish."] },
  compleet: {
    titel: "Your 3D website, made to measure",
    stappen: [
      "Pay securely, then create your account.",
      "Tell Volgo about your business and fill in your own domain name.",
      "Volgo builds a first version of your 3D website straight away, and you plan your 1-on-1 call with the founder or the team.",
      "After the call we finish it to measure. You approve, then it goes live with Volgo inside.",
    ],
  },
  start: { titel: "Live on your website in a few minutes", stappen: ZELF },
  pro: { titel: "We build your website with Volgo inside", stappen: OUD_WEBSITE },
  premium: { titel: "We build your 3D website with Volgo inside", stappen: OUD_WEBSITE },
};
