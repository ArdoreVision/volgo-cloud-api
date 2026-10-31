// Plans. Amounts in cents, per month, excl. VAT.
export type PlanId = "start" | "pro" | "premium";

export const PLANS: Record<
  PlanId,
  { id: PlanId; naam: string; prijs: number; prijsTekst: string; proefDagen: number; tagline: string; features: string[] }
> = {
  start: {
    id: "start",
    naam: "Start",
    prijs: 14995,
    prijsTekst: "149.95",
    proefDagen: 7,
    tagline: "Your website with AVA, answering every visitor.",
    features: [
      "A website built for you",
      "AVA chat on your site, 24/7",
      "Leads ranked by warmth",
      "Dashboard, agenda and team chat",
      "Hot-lead emails and a morning summary",
      "Support by email",
    ],
  },
  pro: {
    id: "pro",
    naam: "Pro",
    prijs: 49999,
    prijsTekst: "499.99",
    proefDagen: 0,
    tagline: "More leads, less admin, and we keep improving it.",
    features: [
      "Everything in Start",
      "A larger website with more pages",
      "AVA trained on all your services and prices",
      "Monthly improvement round on your site and AVA",
      "Priority support",
    ],
  },
  premium: {
    id: "premium",
    naam: "Premium",
    prijs: 99999,
    prijsTekst: "999.99",
    proefDagen: 0,
    tagline: "For businesses with multiple locations or teams.",
    features: [
      "Everything in Pro",
      "Multiple websites or locations",
      "Custom connections to your own systems",
      "A dedicated account manager",
      "Fastest support",
    ],
  },
};

export const isPlan = (v: unknown): v is PlanId => v === "start" || v === "pro" || v === "premium";
