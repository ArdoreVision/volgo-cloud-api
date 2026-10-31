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
  features: string[];
  limieten: {
    /** Max people on the account, including the owner. null = unlimited. */
    leden: number | null;
    teamChat: boolean;
    builder: boolean;
  };
};

export const PLANS: Record<PlanId, Plan> = {
  start: {
    id: "start",
    naam: "Start",
    prijs: 14995,
    prijsTekst: "149.95",
    proefDagen: 7,
    tagline: "Your website with AVA. Simple, just for you.",
    features: [
      "A website built for you, AVA inside",
      "AVA answers visitors 24/7",
      "Leads ranked by warmth",
      "Home assistant, calendar and analytics",
      "Hot-lead emails and a morning summary",
      "1 user",
    ],
    limieten: { leden: 1, teamChat: false, builder: false },
  },
  pro: {
    id: "pro",
    naam: "Pro",
    prijs: 49999,
    prijsTekst: "499.99",
    proefDagen: 0,
    tagline: "For businesses that take leads seriously, with a team.",
    badge: "Most popular",
    features: [
      "Everything in Start",
      "Team chat and video calls",
      "Up to 5 users",
      "AVA trained on all your services and prices",
      "Monthly improvement round on your site and AVA",
      "Priority support",
    ],
    limieten: { leden: 5, teamChat: true, builder: false },
  },
  premium: {
    id: "premium",
    naam: "Premium",
    prijs: 99999,
    prijsTekst: "999.99",
    proefDagen: 0,
    tagline: "Full access for teams. Edit your own website with AVA.",
    badge: "For teams",
    features: [
      "Everything in Pro",
      "Website builder: change your site by asking AVA",
      "Unlimited users",
      "Multiple locations",
      "A dedicated account manager",
      "Fastest support",
    ],
    limieten: { leden: null, teamChat: true, builder: true },
  },
};

export const isPlan = (v: unknown): v is PlanId => v === "start" || v === "pro" || v === "premium";
export const planVan = (v: unknown): Plan => (isPlan(v) ? PLANS[v] : PLANS.start);

/** For the comparison table on the pricing page. */
export const VERGELIJKING: { label: string; start: string | boolean; pro: string | boolean; premium: string | boolean }[] = [
  { label: "Website built for you", start: true, pro: true, premium: true },
  { label: "AVA chat on your site, 24/7", start: true, pro: true, premium: true },
  { label: "Leads ranked by warmth", start: true, pro: true, premium: true },
  { label: "Home assistant (ask AVA about your leads)", start: true, pro: true, premium: true },
  { label: "Calendar and analytics", start: true, pro: true, premium: true },
  { label: "Hot-lead emails and morning summary", start: true, pro: true, premium: true },
  { label: "Users", start: "1", pro: "Up to 5", premium: "Unlimited" },
  { label: "Team chat and video calls", start: false, pro: true, premium: true },
  { label: "AVA trained on all your services and prices", start: false, pro: true, premium: true },
  { label: "Monthly improvement round", start: false, pro: true, premium: true },
  { label: "Website builder with AVA", start: false, pro: false, premium: true },
  { label: "Multiple locations", start: false, pro: false, premium: true },
  { label: "Dedicated account manager", start: false, pro: false, premium: true },
  { label: "Free trial", start: "7 days", pro: false, premium: false },
];
