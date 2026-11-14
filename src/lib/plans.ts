// Plans. Amounts in cents, per month, excl. VAT. Limits are enforced in the app.
// Volgo is one product: an appointment setter that goes into the customer's own website. No website is built or included.
export type PlanId = "start" | "pro" | "premium";

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
  /** Headline limits, shown first on the plan card (like "300 Active Conversations"). */
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
    /** AI conversations per calendar month. Above this, Volgo still captures leads in basic mode. */
    gesprekken: number;
    /** Longest analytics range in days. */
    analyticsDagen: number;
  };
};

/** Old website packages (sold 13 Nov 2026): the website was built by Volgo, with Volgo inside. No longer sold; existing customers keep them. */
const WEBSITE_LIMIETEN: Plan["limieten"] = { leden: 5, teamChat: true, eigenStijl: true, website: true, gesprekken: 3000, analyticsDagen: 90 };

export const PLANS: Record<PlanId, Plan> = {
  start: {
    id: "start",
    naam: "Volgo",
    prijs: 4999,
    prijsTekst: "49,99",
    proefDagen: 0,
    opstart: 0,
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
    // Same Volgo as before, only without a website built by us.
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

/** The one plan that is sold now: Volgo, the appointment setter you put in your own website, €49,99 a month. No website included. */
export const ZICHTBAAR: PlanId[] = ["start"];

/** "Volgo" for the plan that is simply called Volgo, "Volgo Website" for the old packages. */
export const planTitel = (p: Plan) => (p.naam === "Volgo" ? "Volgo" : `Volgo ${p.naam}`);

export const isPlan = (v: unknown): v is PlanId => v === "start" || v === "pro" || v === "premium";
export const planVan = (v: unknown): Plan => (isPlan(v) ? PLANS[v] : PLANS.start);

/** Everything in the plan, as a table on the pricing page. */
export const VERGELIJKING: { label: string; start: string | boolean; pro: string | boolean; premium: string | boolean }[] = [
  { label: "Works on your own website (WordPress, Wix, Shopify, Squarespace, Webflow, custom)", start: true, pro: true, premium: true },
  { label: "Install with one line of code, or we do it for you", start: true, pro: true, premium: true },
  { label: "Answers every visitor, 24/7", start: true, pro: true, premium: true },
  { label: "Asks your questions before an appointment", start: true, pro: true, premium: true },
  { label: "Visitors pick a free day and time themselves", start: true, pro: true, premium: true },
  { label: "Phone, visit, office and chat appointments", start: true, pro: true, premium: true },
  { label: "Your opening hours and appointment length", start: true, pro: true, premium: true },
  { label: "Confirmation after booking", start: true, pro: true, premium: true },
  { label: "Reminder the day before", start: true, pro: true, premium: true },
  { label: "Follow-up after 1 and 3 days", start: true, pro: true, premium: true },
  { label: "Notification for every chat and appointment", start: true, pro: true, premium: true },
  { label: "All your customers together in one app", start: true, pro: true, premium: true },
  { label: "Own chat name, photo and colour", start: true, pro: true, premium: true },
  { label: "Users", start: "5", pro: "5", premium: "5" },
  { label: "A website built by us", start: "Not included", pro: "€997", premium: "€1997" },
  { label: "Volgo, per month", start: "€49,99", pro: "€49,99", premium: "€49,99" },
  { label: "Subscription", start: "Monthly, cancel any time", pro: "Monthly, cancel any time", premium: "Monthly, cancel any time" },
];

/** What happens after you subscribe, per plan. Shown on the pricing page. */
export const START_STAPPEN: Record<PlanId, { titel: string; stappen: string[] }> = {
  start: {
    titel: "Live on your website in a few minutes",
    stappen: [
      "Pay securely, then create your account. Your dashboard opens right away.",
      "Answer 5 short questions about your business and set your opening hours.",
      "Copy your one line of code and paste it into your website. Your dashboard shows where, per platform.",
      "Press Check. Volgo looks at your website and tells you it is live. From then on appointments come in by themselves.",
    ],
  },
  pro: {
    titel: "We build your website with Volgo inside",
    stappen: [
      "Pay securely, then create your account. Your dashboard opens right away.",
      "Open the Website tab and tell us what you want, by chat or in a call. We build your site to measure.",
      "You review it, we launch it on your own domain with Volgo built in.",
      "Volgo is live on it from day one.",
    ],
  },
  premium: {
    titel: "We build your 3D website with Volgo inside",
    stappen: [
      "Pay securely, then create your account. Your dashboard opens right away.",
      "Open the Website tab and tell us what you want, by chat or in a call: pages, 3D visuals, animations.",
      "You review it, we launch it on your own domain with Volgo built in.",
      "Volgo is live on it from day one.",
    ],
  },
};
