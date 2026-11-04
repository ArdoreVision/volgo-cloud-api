import { PLANS, PROEF_DAGEN } from "@/lib/plans";

/**
 * "Volgo vs …" comparison pages. One entry per competitor; the page itself is in components/volgo/vs-pagina.tsx.
 * Competitor facts are what their own site and public reviews show at `peildatum`; keep them honest and re-check every quarter.
 */
export type VsRij = { wat: string; volgo: string; ander: string; win?: boolean };

export type Vergelijking = {
  slug: string;
  naam: string;
  /** Legal line: owner of the trademark. */
  eigenaar: string;
  peildatum: string;
  titel: string;
  metaTitel: string;
  metaBeschrijving: string;
  intro: string;
  rijen: VsRij[];
  kiesAnder: string;
  kiesVolgo: string;
  overstappen: string;
  noot: string;
};

const START = PLANS.start.prijsTekst;

export const VERGELIJKINGEN: Record<string, Vergelijking> = {
  podium: {
    slug: "podium",
    naam: "Podium",
    eigenaar: "Podium Corporation",
    peildatum: "November 2026",
    titel: "Same job. No sales call. A fraction of the price.",
    metaTitel: `Volgo vs Podium · The Podium alternative from €${START} a month, no sales call`,
    metaBeschrijving: `Looking for a Podium alternative? Volgo answers every website visitor, books the appointment and scores your leads — from €${START} a month, monthly, no demo call, live in 5 minutes.`,
    intro: `Podium is a great all-in-one suite for big, multi-location businesses — with a demo call, a quote and usually a yearly contract. Volgo does the one thing that makes you money: answer every lead, book the appointment, tell you who to call first. From €${START} a month, live today.`,
    rijen: [
      { wat: "Price", volgo: `From €${START}/month, shown on the site`, ander: "Not published — quote via sales (reported $399–$599/mo)", win: true },
      { wat: "Getting started", volgo: `Pick a plan, ${PROEF_DAGEN} days free, live in 5 minutes`, ander: "Book a demo call with a sales rep first", win: true },
      { wat: "Contract", volgo: "Monthly, cancel any time in your dashboard", ander: "Typically an annual contract", win: true },
      { wat: "AI on your website", volgo: "AVA answers every visitor in seconds, day and night", ander: "Webchat with AI employee" },
      { wat: "Books the appointment", volgo: "In the chat, on your calendar", ander: "Yes, via AI scheduler" },
      { wat: "Tells you who to call first", volgo: "Every lead scored 0–100 + morning summary", ander: "Lead inbox" },
      { wat: "Custom website included", volgo: "Pro and Premium: we build it, AVA inside", ander: "No", win: true },
      { wat: "Languages", volgo: "AVA replies in the visitor's language", ander: "English-first" },
      { wat: "Reviews, texting, payments", volgo: "Not yet — we do leads and bookings only", ander: "Yes, big all-in-one suite" },
      { wat: "Built for", volgo: "Owner-run businesses: contractors, dentists, hotels, salons", ander: "Multi-location businesses and franchises" },
    ],
    kiesAnder: "Pick Podium if you run many locations, want reviews, texting, payments and phones in one suite, and have a team to run it.",
    kiesVolgo: "Pick Volgo if you run your own business, lose leads after hours or while you work, and want them answered and booked without you.",
    overstappen: "Nothing to migrate. Add one line of code to your site, or let us build your site on Pro. Your Podium contract can run out on its own.",
    noot: "Podium publishes no prices; the range shown is what reviewers report.",
  },
  birdeye: {
    slug: "birdeye",
    naam: "Birdeye",
    eigenaar: "Birdeye Inc.",
    peildatum: "November 2026",
    titel: "Built for reviews. Volgo is built for the next customer.",
    metaTitel: `Volgo vs Birdeye · The Birdeye alternative for leads and bookings, from €${START} a month`,
    metaBeschrijving: `Birdeye is a reputation platform priced per location on yearly contracts. Volgo answers every website visitor, books the appointment and scores your leads — from €${START} a month, monthly, no demo call.`,
    intro: `Birdeye is a reputation and listings platform: reviews first, chat as an add-on, priced per location on a yearly contract after a demo. Volgo starts where the money is: the visitor on your website right now. AVA answers, books and tells you who to call first — from €${START} a month, live today.`,
    rijen: [
      { wat: "Price", volgo: `From €${START}/month, shown on the site`, ander: "$299–$449 per location per month, after a demo", win: true },
      { wat: "Getting started", volgo: `Pick a plan, ${PROEF_DAGEN} days free, live in 5 minutes`, ander: "Request a demo, then onboarding", win: true },
      { wat: "Contract", volgo: "Monthly, cancel any time in your dashboard", ander: "Annual contract, billed yearly", win: true },
      { wat: "AI on your website", volgo: "AVA answers every visitor in seconds, every plan", ander: "Chatbot AI on the top (Dominate) tier", win: true },
      { wat: "Books the appointment", volgo: "In the chat, on your calendar", ander: "Via messaging and appointment tools" },
      { wat: "Tells you who to call first", volgo: "Every lead scored 0–100 + morning summary", ander: "Shared inbox" },
      { wat: "Custom website included", volgo: "Pro and Premium: we build it, AVA inside", ander: "No", win: true },
      { wat: "Reviews and listings", volgo: "Not yet — we do leads and bookings only", ander: "Yes, that is their core product" },
      { wat: "Multiple locations", volgo: "One price, Premium for teams", ander: "Price multiplies per location" },
      { wat: "Built for", volgo: "Owner-run businesses: contractors, dentists, hotels, salons", ander: "Multi-location brands managing reputation" },
    ],
    kiesAnder: "Pick Birdeye if reviews and Google listings are your main problem and you run several locations with a marketing team.",
    kiesVolgo: "Pick Volgo if your problem is leads that go unanswered after hours or while you work, and you want them booked without you.",
    overstappen: "Keep Birdeye for reviews if you like it; AVA runs next to it with one line of code. Or let us build your site on Pro.",
    noot: "Birdeye prices are per location, billed annually, as shown on birdeye.com and in public reviews.",
  },
  tidio: {
    slug: "tidio",
    naam: "Tidio",
    eigenaar: "Tidio LLC",
    peildatum: "November 2026",
    titel: "A chat widget you set up. Or a lead machine that runs itself.",
    metaTitel: `Volgo vs Tidio · Tidio alternative that answers, scores and books your leads, from €${START} a month`,
    metaBeschrijving: `Tidio is a live-chat tool with a metered AI add-on you train yourself. Volgo's AVA answers every visitor, books the appointment and scores your leads out of the box — from €${START} a month, nothing to build.`,
    intro: `Tidio is a good live-chat and support tool: cheap to start, but you build the bot, train the AI add-on and pay per AI conversation. Volgo is for owners who have no time for that. AVA answers every visitor, books the appointment and tells you who to call first — from day one, from €${START} a month.`,
    rijen: [
      { wat: "Price", volgo: `From €${START}/month, AI conversations included`, ander: "From $29/mo for live chat; AI (Lyro) extra from $39/mo" },
      { wat: "AI conversations", volgo: "300 to 5,000 a month included in your plan", ander: "Metered add-on, about $0.70 per AI conversation", win: true },
      { wat: "Setup", volgo: "Answer 5 questions, paste one line of code. Done.", ander: "Build flows, write answers, train Lyro yourself", win: true },
      { wat: "Who answers at 9 PM", volgo: "AVA, in seconds, in the visitor's language", ander: "Lyro if trained and in quota; otherwise a form" },
      { wat: "Books the appointment", volgo: "In the chat, on your calendar", ander: "Not built in — needs an integration", win: true },
      { wat: "Tells you who to call first", volgo: "Every lead scored 0–100 + morning summary", ander: "No lead scoring", win: true },
      { wat: "Custom website included", volgo: "Pro and Premium: we build it, AVA inside", ander: "No", win: true },
      { wat: "Live chat with your team", volgo: "Team chat on Pro and Premium", ander: "Yes, that is their core product" },
      { wat: "Contract", volgo: "Monthly, cancel any time", ander: "Monthly or annual" },
      { wat: "Built for", volgo: "Owner-run businesses that sell appointments and quotes", ander: "Support teams and online shops" },
    ],
    kiesAnder: "Pick Tidio if you have a support team that answers chats live, sell products online, and like building your own flows.",
    kiesVolgo: "Pick Volgo if you sell appointments or quotes, nobody can sit on a chat all day, and you want leads answered and booked for you.",
    overstappen: "Remove the Tidio snippet, add Volgo's one line. AVA knows your business after five questions; nothing to rebuild.",
    noot: "Tidio prices from tidio.com (monthly billing); AI conversations are billed on a separate meter.",
  },
};

export function vergelijking(slug: string): Vergelijking | null {
  return VERGELIJKINGEN[slug] ?? null;
}
