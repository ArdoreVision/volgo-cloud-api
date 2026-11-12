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
  /** One-time setup fee in cents, charged with the first payment (0 = none). */
  opstart: number;
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

export const PLANS: Record<PlanId, Plan> = {
  start: {
    id: "start",
    naam: "Volgo",
    prijs: 9900,
    prijsTekst: "99",
    proefDagen: PROEF_DAGEN,
    opstart: 0,
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
    naam: "Volgo + Website",
    prijs: 9900,
    prijsTekst: "99",
    proefDagen: 0,
    opstart: 99700,
    tagline: "A new premium website built for you, with the Volgo chat assistant inside. You do nothing.",
    badge: "Most chosen",
    kern: ["New premium website, built by Volgo", "Assistant on it, 24/7", "€997 one-time for your website"],
    features: [
      "Everything in Volgo",
      "Website made to measure, via chat or call",
      "Photos, video and animations on your site",
      "Your own chat photo and style, no Volgo branding",
      "Changes to your website when you need them",
      "Priority support",
    ],
    limieten: { leden: 5, teamChat: true, eigenStijl: true, website: true, gesprekken: 3000, analyticsDagen: 90 },
  },
  premium: {
    id: "premium",
    naam: "Premium",
    prijs: 99700,
    prijsTekst: "997",
    proefDagen: PROEF_DAGEN,
    opstart: 0,
    verborgen: true,
    tagline: "Everything in Pro, for high-volume teams with bigger websites.",
    badge: "For teams",
    kern: ["5,000 Volgo conversations / month", "Unlimited users", "Larger custom website"],
    features: [
      "Everything in Pro",
      "More pages, advanced animations and video",
      "Photo and video tools for your site",
      "Changes to your website whenever you need them",
      "Volgo on multiple websites or locations",
      "Fastest support",
    ],
    limieten: { leden: null, teamChat: true, eigenStijl: true, website: true, gesprekken: 5000, analyticsDagen: 90 },
  },
};

/** The plans that are sold now, in order. Premium stays valid for existing customers only. */
export const ZICHTBAAR: PlanId[] = ["start", "pro"];

export const isPlan = (v: unknown): v is PlanId => v === "start" || v === "pro" || v === "premium";
export const planVan = (v: unknown): Plan => (isPlan(v) ? PLANS[v] : PLANS.start);

/** For the comparison table on the pricing page. */
export const VERGELIJKING: { label: string; start: string | boolean; pro: string | boolean; premium: string | boolean }[] = [
  { label: "Chat assistant on your website, 24/7", start: true, pro: true, premium: true },
  { label: "All warm customers together in one app", start: true, pro: true, premium: true },
  { label: "Asks your questions before an appointment", start: true, pro: true, premium: true },
  { label: "Phone, visit and chat appointments in your calendar", start: true, pro: true, premium: true },
  { label: "Notification when someone starts chatting", start: true, pro: true, premium: true },
  { label: "Read chats live and take over", start: true, pro: true, premium: true },
  { label: "Set up for you", start: true, pro: true, premium: true },
  { label: "New premium website built by Volgo", start: false, pro: true, premium: true },
  { label: "Photos, video and animations on your website", start: false, pro: true, premium: true },
  { label: "Own chat photo and style, no Volgo branding", start: false, pro: true, premium: true },
  { label: "Users", start: "1", pro: "5", premium: "Unlimited" },
  { label: "Setup fee", start: "€0", pro: "€997 one-time", premium: "—" },
  { label: "Trial", start: "7 days for €1", pro: "—", premium: "—" },
  { label: "Domain name", start: "—", pro: "Not included", premium: "Not included" },
  { label: "Contract", start: "Monthly, cancel any time", pro: "Monthly, cancel any time", premium: "Monthly, cancel any time" },
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
    titel: "We build your new website with the assistant inside",
    stappen: [
      "Create your account and open the Website tab.",
      "Tell us what you want, by chat or in a call. We build your site to measure.",
      "You review it, we launch it on your own domain with Volgo built in.",
      "Your assistant is live on it from day one.",
    ],
  },
  premium: {
    titel: "We build a larger website with Volgo inside",
    stappen: [
      "Create your account and open the Website tab.",
      "We plan your site together by chat or call: pages, photos, video, animations.",
      "We launch it on your own domain with Volgo built in, and set up your team.",
      "Need changes later? Ask any time, we handle them.",
    ],
  },
};
