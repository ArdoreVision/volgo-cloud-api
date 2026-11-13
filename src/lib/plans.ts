// Plans. Amounts in cents, per month, excl. VAT. Limits are enforced in the app.
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

/** Both website packages come with the same Volgo: the price and the limits are identical, only the website differs. */
const WEBSITE_LIMIETEN: Plan["limieten"] = { leden: 5, teamChat: true, eigenStijl: true, website: true, gesprekken: 3000, analyticsDagen: 90 };

export const PLANS: Record<PlanId, Plan> = {
  start: {
    id: "start",
    naam: "Volgo",
    prijs: 9900,
    prijsTekst: "99",
    proefDagen: PROEF_DAGEN,
    opstart: 0,
    verborgen: true,
    tagline: "A chat assistant on your own website, 24/7. Every warm customer lands in one app, instead of scattered across your mail and apps.",
    kern: ["Chat assistant on your website, 24/7", "All warm customers in one app", "We set it up for you"],
    features: [
      "Answers every visitor, day and night, 7 days a week",
      "Asks the questions you need before an appointment",
      "Visitors book a phone call, a visit at their address or a chat appointment",
      "Name, address and all answers saved with the appointment",
      "A notification the moment someone starts chatting",
      "Read every chat live and take over yourself",
      "Call or chat back from the appointment in one tap",
    ],
    limieten: { leden: 1, teamChat: false, eigenStijl: false, website: false, gesprekken: 1000, analyticsDagen: 30 },
  },
  pro: {
    id: "pro",
    naam: "Website",
    prijs: 4999,
    prijsTekst: "49,99",
    proefDagen: 0,
    opstart: 99700,
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

/** The plans that are sold now, in order: Website (one-time €997) and 3D website (one-time €1997), each with Volgo at €49,99 a month. */
export const ZICHTBAAR: PlanId[] = ["pro", "premium"];

export const isPlan = (v: unknown): v is PlanId => v === "start" || v === "pro" || v === "premium";
export const planVan = (v: unknown): Plan => (isPlan(v) ? PLANS[v] : PLANS.start);

/** For the comparison table on the pricing page. */
export const VERGELIJKING: { label: string; start: string | boolean; pro: string | boolean; premium: string | boolean }[] = [
  { label: "Professional website, made to measure", start: false, pro: true, premium: true },
  { label: "Photos and video on your website", start: false, pro: true, premium: true },
  { label: "3D visuals that move as you scroll", start: false, pro: false, premium: true },
  { label: "Scroll animations across the whole site", start: false, pro: false, premium: true },
  { label: "Volgo on your website, 24/7", start: true, pro: true, premium: true },
  { label: "Asks your questions before an appointment", start: true, pro: true, premium: true },
  { label: "Phone, visit and chat appointments in your calendar", start: true, pro: true, premium: true },
  { label: "All your customers together in one app", start: true, pro: true, premium: true },
  { label: "Notification when someone starts chatting", start: true, pro: true, premium: true },
  { label: "Own chat photo and style, no Volgo branding", start: false, pro: true, premium: true },
  { label: "Users", start: "1", pro: "5", premium: "5" },
  { label: "Website, one-time", start: "—", pro: "€997", premium: "€1997" },
  { label: "Volgo, per month", start: "€99", pro: "€49,99", premium: "€49,99" },
  { label: "Domain name", start: "—", pro: "Not included", premium: "Not included" },
  { label: "Volgo subscription", start: "Monthly, cancel any time", pro: "Monthly, cancel any time", premium: "Monthly, cancel any time" },
];

/** What happens after you subscribe, per plan. Shown on the pricing page. */
export const START_STAPPEN: Record<PlanId, { titel: string; stappen: string[] }> = {
  start: {
    titel: "We put the assistant on your website",
    stappen: [
      "Create your account and start your 7 days for €1.",
      "Answer 5 short questions about your business.",
      "We add the assistant to your website (or you paste one line of code yourself).",
      "Chats and appointments appear in your dashboard straight away.",
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
