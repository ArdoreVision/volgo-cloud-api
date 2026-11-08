// Five closed questions every new account answers before the dashboard opens.
// The answers tell Volgo what kind of business it works for, and how to talk to its customers.

export type VraagId = "sector" | "klanten" | "vervolg" | "doorlooptijd" | "toon";

export type Optie = {
  id: string;
  label: string;
  /** Short line under the label in the wizard. */
  uitleg?: string;
  /** What Volgo is told. Written as a fact about the business. */
  ava: string;
};

export type Vraag = { id: VraagId; titel: string; sub: string; opties: Optie[] };

export const VRAGEN: Vraag[] = [
  {
    id: "sector",
    titel: "Wat voor bedrijf ben je?",
    sub: "Zodat Volgo de juiste woorden gebruikt en de juiste vragen stelt.",
    opties: [
      { id: "bouw", label: "Aannemer of verbouwing", uitleg: "Bouw, verbouw, dak, uitbouw", ava: "The business is a contractor / renovation company (building, remodeling, roofing, extensions). Visitors usually describe a project and want a price indication and a start date." },
      { id: "installatie", label: "Installateur", uitleg: "Verwarming, koeling, zonnepanelen, elektra, loodgieter", ava: "The business is an installer (heating, cooling, solar, electrical or plumbing). Many visitors have an urgent problem or want a new system; ask what, where and how urgent." },
      { id: "interieur", label: "Keukens, badkamers of interieur", uitleg: "Ontwerp en montage", ava: "The business designs and installs kitchens, bathrooms or interiors. Visitors are planning a project; ask about size, wishes, budget range and timing." },
      { id: "diensten", label: "Diensten voor huis of tuin", uitleg: "Hovenier, schilder, schoonmaak, zwembaden, vloeren", ava: "The business provides home or garden services (landscaping, painting, cleaning, pools, flooring and similar). Ask what needs doing, how big the job is and when." },
      { id: "praktijk", label: "Praktijk, kliniek of kantoor", uitleg: "Tandarts, kliniek, makelaar, adviseurs", ava: "The business is a practice, clinic or professional office. Visitors want an appointment or a short answer; be discreet, never give medical or legal advice, and offer to book or be called back." },
      { id: "anders", label: "Iets anders", ava: "The business type is not listed; rely on the description below and ask the visitor what they need." },
    ],
  },
  {
    id: "klanten",
    titel: "Wie zijn je klanten?",
    sub: "Volgo past zijn vragen aan op particulieren of bedrijven.",
    opties: [
      { id: "particulier", label: "Huiseigenaren en particulieren", ava: "Customers are mainly homeowners and private individuals. Keep it simple and personal, ask for their town or postcode and the best moment to reach them." },
      { id: "zakelijk", label: "Bedrijven", ava: "Customers are mainly businesses. Ask for the company name, the contact person's role and the scale or number of locations." },
      { id: "beide", label: "Allebei", ava: "Customers are both private individuals and businesses. Ask early whether the request is for a home or for a company, and adapt." },
    ],
  },
  {
    id: "vervolg",
    titel: "Wat gebeurt er meestal na een eerste aanvraag?",
    sub: "Volgo vertelt bezoekers precies wat de volgende stap is.",
    opties: [
      { id: "bezoek", label: "We komen langs voor een gratis offerte", ava: "Next step after a request: a free on-site visit to measure and quote. Offer to plan that visit and collect name, phone number and address or town." },
      { id: "offerte", label: "We sturen een offerte per mail", ava: "Next step after a request: the team sends a quote by email. Collect the details needed for it (what, how much, where, when) plus name and email." },
      { id: "afspraak", label: "Ze boeken een afspraak bij ons", ava: "Next step after a request: the visitor books an appointment at the business or online. Offer to book one and collect name and phone number or email." },
      { id: "bellen", label: "We bellen eerst terug", ava: "Next step after a request: the team calls the visitor back. Collect name, phone number and a good moment to call." },
    ],
  },
  {
    id: "doorlooptijd",
    titel: "Hoe snel kun je meestal beginnen of reageren?",
    sub: "Volgo schept eerlijke verwachtingen, zonder data te beloven.",
    opties: [
      { id: "dagen", label: "Binnen een paar dagen", ava: "Typical lead time: the team can usually respond or start within a few days. You may say that, but never promise a specific date." },
      { id: "weken", label: "Binnen 1 tot 2 weken", ava: "Typical lead time: usually within one to two weeks. You may say that, but never promise a specific date." },
      { id: "maand", label: "Een maand of langer", ava: "Typical lead time: a month or longer; the business is often booked ahead. Say so kindly and suggest planning early. Never promise a specific date." },
      { id: "wisselt", label: "Hangt af van de klus", ava: "Lead time depends on the job. Don't estimate it; say the team will share timing personally after they know the details." },
    ],
  },
  {
    id: "toon",
    titel: "Hoe moet Volgo klinken voor je klanten?",
    sub: "Volgo schrijft elk antwoord in deze toon.",
    opties: [
      { id: "vriendelijk", label: "Vriendelijk en losjes", uitleg: "Als een behulpzame collega", ava: "Tone: friendly and casual, like a helpful colleague. Warm, plain language, no jargon." },
      { id: "zakelijk", label: "Zakelijk en to the point", uitleg: "Kort, duidelijk, geen kletspraat", ava: "Tone: professional and to the point. Short, clear sentences, polite, no small talk." },
      { id: "warm", label: "Warm en geruststellend", uitleg: "Rustig, geduldig, neemt zorgen weg", ava: "Tone: warm and reassuring. Calm and patient; acknowledge worries (a leak, a deadline) before asking the next question." },
    ],
  },
];

export type Profiel = Partial<Record<VraagId, string>>;

export function leesProfiel(json: string | null | undefined): Profiel {
  if (!json) return {};
  try {
    const p = JSON.parse(json) as unknown;
    if (!p || typeof p !== "object") return {};
    const uit: Profiel = {};
    for (const v of VRAGEN) {
      const w = (p as Record<string, unknown>)[v.id];
      if (typeof w === "string" && v.opties.some((o) => o.id === w)) uit[v.id] = w;
    }
    return uit;
  } catch {
    return {};
  }
}

/** All five answered? */
export function profielCompleet(p: Profiel) {
  return VRAGEN.every((v) => Boolean(p[v.id]));
}

/** The chosen option per question, for showing the answers back. */
export function profielAntwoorden(p: Profiel) {
  return VRAGEN.map((v) => ({ vraag: v, optie: v.opties.find((o) => o.id === p[v.id]) ?? null }));
}

/** Lines for Volgo's system prompt. Empty when nothing was answered. */
export function profielVoorAva(p: Profiel) {
  return VRAGEN.map((v) => v.opties.find((o) => o.id === p[v.id])?.ava)
    .filter(Boolean)
    .map((z) => `- ${z}`)
    .join("\n");
}
