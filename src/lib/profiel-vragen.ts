// Five closed questions every new account answers before the dashboard opens.
// The answers tell Volgo what kind of business it works for, and how to talk to its customers.

export type VraagId = "sector" | "klanten" | "vervolg" | "doorlooptijd" | "toon";

export type Optie = {
  id: string;
  label: string;
  /** Short line under the label in the wizard. */
  uitleg?: string;
  /** An earlier option: not offered anymore, still valid for accounts that chose it. */
  oud?: boolean;
  /** What Volgo is told. Written as a fact about the business. */
  ava: string;
};

export type Vraag = { id: VraagId; titel: string; sub: string; opties: Optie[] };

export const VRAGEN: Vraag[] = [
  {
    id: "sector",
    titel: "What kind of business are you?",
    sub: "So Volgo uses the right words and asks the right questions.",
    opties: [
      { id: "salon", label: "Salon, barber or beauty", uitleg: "Hair, nails, skincare, massage", ava: "The business is a salon, barber or beauty business. Visitors want to book a treatment; ask which treatment and offer a time." },
      { id: "auto", label: "Car care or garage", uitleg: "Detailing, repair, tyres, car wash", ava: "The business works on cars (detailing, repair, tyres or similar). Ask which car, what needs doing and offer a time to bring it in or to come by." },
      { id: "praktijk", label: "Practice, clinic or office", uitleg: "Dentist, physio, estate agent, advisers", ava: "The business is a practice, clinic or professional office. Visitors want an appointment or a short answer; be discreet, never give medical or legal advice, and offer to book or be called back." },
      { id: "coach", label: "Coach, trainer or studio", uitleg: "Coaching, personal training, classes", ava: "The business is a coach, trainer or studio. Visitors want an intake or a first session; ask what they want to achieve and offer a time." },
      { id: "diensten", label: "Services for home or garden", uitleg: "Gardener, painter, cleaning, pools, floors", ava: "The business provides home or garden services (landscaping, painting, cleaning, pools, flooring and similar). Ask what needs doing, how big the job is and when." },
      { id: "bouw", label: "Contractor or installer", uitleg: "Building, renovation, heating, solar, plumbing", ava: "The business is a contractor or installer (building, remodeling, heating, solar, electrical or plumbing). Visitors usually describe a project or a problem; ask what, where and how urgent, and offer a visit." },
      { id: "anders", label: "Something else", ava: "The business type is not listed; rely on the description below and ask the visitor what they need." },
      // Earlier options: no longer offered, still valid for accounts that chose them.
      { id: "installatie", oud: true, label: "Installer", uitleg: "Heating, cooling, solar, electrical, plumbing", ava: "The business is an installer (heating, cooling, solar, electrical or plumbing). Many visitors have an urgent problem or want a new system; ask what, where and how urgent." },
      { id: "interieur", oud: true, label: "Kitchens, bathrooms or interiors", uitleg: "Design and fitting", ava: "The business designs and installs kitchens, bathrooms or interiors. Visitors are planning a project; ask about size, wishes, budget range and timing." },
    ],
  },
  {
    id: "klanten",
    titel: "Who are your customers?",
    sub: "Volgo adapts its questions to private customers or businesses.",
    opties: [
      { id: "particulier", label: "Private customers", ava: "Customers are mainly private individuals. Keep it simple and personal, ask for their town or postcode when it matters and the best moment to reach them." },
      { id: "zakelijk", label: "Businesses", ava: "Customers are mainly businesses. Ask for the company name, the contact person's role and the scale or number of locations." },
      { id: "beide", label: "Both", ava: "Customers are both private individuals and businesses. Ask early whether the request is private or for a company, and adapt." },
    ],
  },
  {
    id: "vervolg",
    titel: "What usually happens after a first request?",
    sub: "Volgo tells visitors exactly what the next step is.",
    opties: [
      { id: "afspraak", label: "They book an appointment with us", ava: "Next step after a request: the visitor books an appointment at the business or online. Offer to book one and collect name and phone number or email." },
      { id: "bezoek", label: "We come by for a free quote", ava: "Next step after a request: a free on-site visit to measure and quote. Offer to plan that visit and collect name, phone number and address or town." },
      { id: "offerte", label: "We send a quote by email", ava: "Next step after a request: the team sends a quote by email. Collect the details needed for it (what, how much, where, when) plus name and email." },
      { id: "bellen", label: "We call back first", ava: "Next step after a request: the team calls the visitor back. Collect name, phone number and a good moment to call." },
    ],
  },
  {
    id: "doorlooptijd",
    titel: "How soon can you usually help someone?",
    sub: "Volgo sets honest expectations, without promising dates.",
    opties: [
      { id: "dagen", label: "Within a few days", ava: "Typical lead time: the team can usually respond or start within a few days. You may say that, but never promise a specific date." },
      { id: "weken", label: "Within 1 to 2 weeks", ava: "Typical lead time: usually within one to two weeks. You may say that, but never promise a specific date." },
      { id: "maand", label: "A month or longer", ava: "Typical lead time: a month or longer; the business is often booked ahead. Say so kindly and suggest planning early. Never promise a specific date." },
      { id: "wisselt", label: "It depends", ava: "Lead time depends on the job. Don't estimate it; say the team will share timing personally after they know the details." },
    ],
  },
  {
    id: "toon",
    titel: "How should Volgo sound to your customers?",
    sub: "Volgo writes every answer in this tone.",
    opties: [
      { id: "vriendelijk", label: "Friendly and casual", uitleg: "Like a helpful colleague", ava: "Tone: friendly and casual, like a helpful colleague. Warm, plain language, no jargon." },
      { id: "zakelijk", label: "Professional and to the point", uitleg: "Short, clear, no small talk", ava: "Tone: professional and to the point. Short, clear sentences, polite, no small talk." },
      { id: "warm", label: "Warm and reassuring", uitleg: "Calm, patient, takes worries away", ava: "Tone: warm and reassuring. Calm and patient; acknowledge worries (a leak, a deadline) before asking the next question." },
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
