// Plans. Amounts in cents, per month, excl. VAT. Limits are enforced in the app.
export type PlanId = "start" | "pro" | "premium";

export type Plan = {
  id: PlanId;
  naam: string;
  prijs: number;
  prijsTekst: string;
  proefDagen: number;
  tagline: string;
  badge?: string;
  /** Headline limits, shown first on the plan card (like "300 Active Conversations"). */
  kern: string[];
  features: string[];
  limieten: {
    /** Max people on the account, including the owner. null = unlimited. */
    leden: number | null;
    teamChat: boolean;
    /** Own photo and style for the chat, no "Volgo" mention. */
    eigenStijl: boolean;
    /** AI conversations per calendar month. Above this, AVA still captures leads in basic mode. */
    gesprekken: number;
    /** Longest analytics range in days. */
    analyticsDagen: number;
  };
};

export const PLANS: Record<PlanId, Plan> = {
  start: {
    id: "start",
    naam: "Start",
    prijs: 14700,
    prijsTekst: "147",
    proefDagen: 7,
    tagline: "For owners who want every website lead answered and followed up.",
    kern: ["300 AVA conversations / month", "1 user"],
    features: [
      "AVA on your website, 24/7",
      "Leads ranked by warmth",
      "Track leads from new to quote to won",
      "Hot-lead emails and a morning summary",
      "Calendar and 30-day analytics",
      "Standard email support",
    ],
    limieten: { leden: 1, teamChat: false, eigenStijl: false, gesprekken: 300, analyticsDagen: 30 },
  },
  pro: {
    id: "pro",
    naam: "Pro",
    prijs: 49700,
    prijsTekst: "497",
    proefDagen: 7,
    tagline: "Built for teams that need follow-up, accountability and visibility.",
    badge: "Most popular",
    kern: ["1,000 AVA conversations / month", "5 users"],
    features: [
      "Everything in Start",
      "Team chat and video calls",
      "Your own AVA photo and style, no Volgo branding",
      "AVA trained on all your services and prices",
      "90-day analytics",
      "Monthly review of your leads and AVA",
      "Priority email support",
    ],
    limieten: { leden: 5, teamChat: true, eigenStijl: true, gesprekken: 1000, analyticsDagen: 90 },
  },
  premium: {
    id: "premium",
    naam: "Premium",
    prijs: 99700,
    prijsTekst: "997",
    proefDagen: 7,
    tagline: "Everything in Pro, for high-volume sales teams.",
    badge: "For teams",
    kern: ["5,000 AVA conversations / month", "Unlimited users"],
    features: [
      "Everything in Pro",
      "AVA on multiple websites or locations",
      "Fastest support",
    ],
    limieten: { leden: null, teamChat: true, eigenStijl: true, gesprekken: 5000, analyticsDagen: 90 },
  },
};

export const isPlan = (v: unknown): v is PlanId => v === "start" || v === "pro" || v === "premium";
export const planVan = (v: unknown): Plan => (isPlan(v) ? PLANS[v] : PLANS.start);

/** For the comparison table on the pricing page. */
export const VERGELIJKING: { label: string; start: string | boolean; pro: string | boolean; premium: string | boolean }[] = [
  { label: "AVA conversations per month", start: "300", pro: "1,000", premium: "5,000" },
  { label: "Users", start: "1", pro: "5", premium: "Unlimited" },
  { label: "AVA on your website, 24/7", start: true, pro: true, premium: true },
  { label: "Set up for you, one line of code", start: true, pro: true, premium: true },
  { label: "Leads ranked by warmth", start: true, pro: true, premium: true },
  { label: "Lead pipeline: new, quote sent, won", start: true, pro: true, premium: true },
  { label: "Home assistant (ask AVA about your leads)", start: true, pro: true, premium: true },
  { label: "Hot-lead emails and morning summary", start: true, pro: true, premium: true },
  { label: "Calendar", start: true, pro: true, premium: true },
  { label: "Analytics history", start: "30 days", pro: "90 days", premium: "90 days" },
  { label: "Team chat and video calls", start: false, pro: true, premium: true },
  { label: "Own AVA photo and style, no Volgo branding", start: false, pro: true, premium: true },
  { label: "AVA trained on all your services and prices", start: false, pro: true, premium: true },
  { label: "Monthly review of your leads and AVA", start: false, pro: true, premium: true },
  { label: "AVA on multiple websites or locations", start: false, pro: false, premium: true },
  { label: "Support", start: "Email", pro: "Priority email", premium: "Fastest" },
  { label: "Free trial", start: "7 days", pro: "7 days", premium: "7 days" },
];
