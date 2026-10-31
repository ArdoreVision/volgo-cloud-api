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
    /** Volgo builds a custom website with AVA inside (domain not included). */
    website: boolean;
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
    tagline: "The AVA chatbot on your own website, plus the dashboard to see every lead.",
    kern: ["300 AVA conversations / month", "1 user", "AVA on your own website"],
    features: [
      "Install it yourself: one line of code",
      "Leads ranked by warmth",
      "Track leads from new to quote to won",
      "Hot-lead emails and a morning summary",
      "Calendar and 30-day analytics",
      "Standard email support",
    ],
    limieten: { leden: 1, teamChat: false, eigenStijl: false, website: false, gesprekken: 300, analyticsDagen: 30 },
  },
  pro: {
    id: "pro",
    naam: "Pro",
    prijs: 49700,
    prijsTekst: "497",
    proefDagen: 7,
    tagline: "We build your website with AVA inside, plus everything your team needs.",
    badge: "Most popular",
    kern: ["1,000 AVA conversations / month", "5 users", "Custom website built by Volgo"],
    features: [
      "Everything in Start",
      "Website made to measure, via chat or call",
      "Photos, video and animations on your site",
      "Your own AVA photo and style, no Volgo branding",
      "Team chat and video calls",
      "90-day analytics and priority support",
    ],
    limieten: { leden: 5, teamChat: true, eigenStijl: true, website: true, gesprekken: 1000, analyticsDagen: 90 },
  },
  premium: {
    id: "premium",
    naam: "Premium",
    prijs: 99700,
    prijsTekst: "997",
    proefDagen: 7,
    tagline: "Everything in Pro, for high-volume teams with bigger websites.",
    badge: "For teams",
    kern: ["5,000 AVA conversations / month", "Unlimited users", "Larger custom website"],
    features: [
      "Everything in Pro",
      "More pages, advanced animations and video",
      "Photo and video tools for your site",
      "Changes to your website whenever you need them",
      "AVA on multiple websites or locations",
      "Fastest support",
    ],
    limieten: { leden: null, teamChat: true, eigenStijl: true, website: true, gesprekken: 5000, analyticsDagen: 90 },
  },
};

export const isPlan = (v: unknown): v is PlanId => v === "start" || v === "pro" || v === "premium";
export const planVan = (v: unknown): Plan => (isPlan(v) ? PLANS[v] : PLANS.start);

/** For the comparison table on the pricing page. */
export const VERGELIJKING: { label: string; start: string | boolean; pro: string | boolean; premium: string | boolean }[] = [
  { label: "AVA conversations per month", start: "300", pro: "1,000", premium: "5,000" },
  { label: "Users", start: "1", pro: "5", premium: "Unlimited" },
  { label: "AVA chatbot on your own website", start: true, pro: true, premium: true },
  { label: "Dashboard: leads, conversations, calendar", start: true, pro: true, premium: true },
  { label: "Leads ranked by warmth, pipeline to quote and won", start: true, pro: true, premium: true },
  { label: "Hot-lead emails and morning summary", start: true, pro: true, premium: true },
  { label: "Analytics history", start: "30 days", pro: "90 days", premium: "90 days" },
  { label: "Custom website built by Volgo, AVA inside", start: false, pro: true, premium: "Larger site" },
  { label: "Photos, video and animations on your website", start: false, pro: true, premium: "Advanced" },
  { label: "Website changes after launch", start: false, pro: "Monthly round", premium: "Whenever you need" },
  { label: "Own AVA photo and style, no Volgo branding", start: false, pro: true, premium: true },
  { label: "Team chat and video calls", start: false, pro: true, premium: true },
  { label: "AVA on multiple websites or locations", start: false, pro: false, premium: true },
  { label: "Support", start: "Email", pro: "Priority", premium: "Fastest" },
  { label: "Domain name", start: "—", pro: "Not included", premium: "Not included" },
  { label: "Free trial", start: "7 days", pro: "7 days", premium: "7 days" },
];

/** What happens after you subscribe, per plan. Shown on the pricing page. */
export const START_STAPPEN: Record<PlanId, { titel: string; stappen: string[] }> = {
  start: {
    titel: "You install AVA yourself",
    stappen: [
      "Create your account and log in to your dashboard.",
      "Tell AVA about your business: services, area, opening hours.",
      "Copy one line of code and paste it on your own website. Guides below.",
      "Leads appear in your dashboard straight away.",
    ],
  },
  pro: {
    titel: "We build your website with AVA inside",
    stappen: [
      "Create your account and open the Website tab.",
      "Tell us what you want, by chat or in a call. We build your site to measure.",
      "You review it, we launch it on your own domain with AVA built in.",
      "Already have a site you love? You can also just add AVA to it.",
    ],
  },
  premium: {
    titel: "We build a larger website with AVA inside",
    stappen: [
      "Create your account and open the Website tab.",
      "We plan your site together by chat or call: pages, photos, video, animations.",
      "We launch it on your own domain with AVA built in, and set up your team.",
      "Need changes later? Ask any time, we handle them.",
    ],
  },
};
