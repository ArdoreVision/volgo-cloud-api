// Abonnementen. Bedragen in centen, per maand.
export type PlanId = "start" | "pro" | "premium";

export const PLANS: Record<
  PlanId,
  { id: PlanId; naam: string; prijs: number; prijsTekst: string; proefDagen: number; tagline: string; features: string[] }
> = {
  start: {
    id: "start",
    naam: "Start",
    prijs: 14995,
    prijsTekst: "149,95",
    proefDagen: 7,
    tagline: "Een website met AVA die je aanvragen beantwoordt.",
    features: ["Website op maat", "AVA beantwoordt elke aanvraag per e-mail", "Overzicht van al je aanvragen", "Support via e-mail"],
  },
  pro: {
    id: "pro",
    naam: "Pro",
    prijs: 49999,
    prijsTekst: "499,99",
    proefDagen: 0,
    tagline: "AVA volgt op tot de afspraak in je agenda staat.",
    features: ["Alles uit Start", "AVA via WhatsApp en e-mail", "Automatische herinneringen en offerte-opvolging", "Koppeling met je agenda", "Maandelijkse verbeterronde"],
  },
  premium: {
    id: "premium",
    naam: "Premium",
    prijs: 99999,
    prijsTekst: "999,99",
    proefDagen: 0,
    tagline: "Voor bedrijven met meerdere vestigingen of teams.",
    features: ["Alles uit Pro", "Meerdere vestigingen en teamleden", "Maatwerk koppelingen met je systemen", "Vaste accountmanager", "Voorrang bij support"],
  },
};

export const isPlan = (v: unknown): v is PlanId => v === "start" || v === "pro" || v === "premium";
