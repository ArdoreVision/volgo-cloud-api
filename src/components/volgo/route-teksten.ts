// Hand-written copy for the ad route (hero + live demo). English is the source for every
// machine-translated language; Dutch is written by hand so Dutch ads land on natural Dutch.
import { PLANS } from "@/lib/plans";

export type RouteTaal = "en" | "nl";

export type DemoVoorbeeld = {
  /** Sample page inside the frame. */
  src: string;
  domein: string;
  /** Shown in the intro, so nobody thinks it is a real business. */
  bedrijf: string;
  /** Booking button only where the sample business has booking switched on. */
  boeken: boolean;
};

export const DEMO: Record<RouteTaal, DemoVoorbeeld> = {
  en: { src: "/voorbeeld/contractor", domein: "bluebonnetbuild.com", bedrijf: "Bluebonnet Build Co.", boeken: true },
  nl: { src: "/voorbeeld/badkamer", domein: "thevolgo.app/voorbeeld/badkamer", bedrijf: "Badkamerstudio Noordzee", boeken: false },
};

const prijs = PLANS.start.prijsTekst;

export const TEKST = {
  en: {
    voorWie: "For businesses that get inquiries through their website: contractors, installers, salons, clinics and practices.",
    titel: "Every inquiry answered, even when you can’t pick up.",
    sub: "AVA answers your website visitors within seconds, notes their name and number, books appointments and shows you who to call back first. While you’re on a job, with a client or off for the day.",
    probeer: "Try AVA live",
    abos: "See plans",
    proof: ["Try the demo without signing up", `From €${prijs} a month`, "Cancel any time"],
    navProbeer: "Try AVA live",
    navKort: "Try AVA",
    balkAbos: "Plans",
    demoLabel: "Live demo · sample business",
    demoTitel: "Try AVA yourself, right here.",
    demoIntro: (b: string) =>
      `This is the website of ${b}, a made-up remodeling company in Austin, Texas. AVA is on it exactly as your visitors would see it. Ask something the way a customer would. No sign-up, no payment.`,
    voorbeeldKop: "Tap a question to try it:",
    vragen: ["How much does a kitchen remodel cost?", "Do you work in Round Rock?", "Can someone come out for a free estimate this week?"],
    openChat: "Open the chat",
    afspraak: "Book an appointment",
    privacy: "This is a sample business: feel free to use made-up details.",
    laden: "Loading the sample website…",
    volScherm: "Full screen",
    sluiten: "Close",
    vervolgKop: "Want AVA on your website?",
    vervolgTekst: `Plans start at €${prijs} a month, billed monthly. Cancel any time.`,
    vervolgKnop: "See the plans",
    schermKeuze: "Screen size",
    frameTitel: (b: string) => `Sample website of ${b} with AVA`,
  },
  nl: {
    voorWie: "Voor bedrijven die aanvragen via hun website krijgen: aannemers, installateurs, salons, klinieken en praktijken.",
    titel: "Elke aanvraag beantwoord, ook als jij niet kunt opnemen.",
    sub: "AVA beantwoordt je websitebezoekers binnen seconden, noteert naam en telefoonnummer, plant afspraken in en laat zien wie je het eerst moet terugbellen. Terwijl jij op een klus staat, bij een klant zit of vrij bent.",
    probeer: "Probeer AVA live",
    abos: "Bekijk abonnementen",
    proof: ["Demo zonder aanmelden", `Vanaf €${prijs} per maand`, "Maandelijks opzegbaar"],
    navProbeer: "Probeer AVA live",
    navKort: "Probeer AVA",
    balkAbos: "Abonnementen",
    demoLabel: "Live demo · voorbeeldbedrijf",
    demoTitel: "Probeer AVA zelf, hier op de pagina.",
    demoIntro: (b: string) =>
      `Dit is de website van ${b}, een verzonnen badkamerbedrijf in Zeeland. AVA staat erop precies zoals jouw bezoekers haar zouden zien. Stel een vraag zoals een klant dat zou doen. Je hoeft je niet aan te melden en niets te betalen.`,
    voorbeeldKop: "Tik op een vraag om het te proberen:",
    vragen: ["Wat kost een complete badkamer ongeveer?", "Kunnen jullie in maart beginnen? We wonen in Middelburg.", "Kan er iemand langskomen om op te meten?"],
    openChat: "Open de chat",
    afspraak: "Afspraak maken",
    privacy: "Dit is een voorbeeldbedrijf: je kunt gerust verzonnen gegevens gebruiken.",
    laden: "Voorbeeldwebsite laden…",
    volScherm: "Volledig scherm",
    sluiten: "Sluiten",
    vervolgKop: "Wil je AVA op jouw website?",
    vervolgTekst: `Abonnementen vanaf €${prijs} per maand, maandelijks betaald en opzegbaar.`,
    vervolgKnop: "Bekijk de abonnementen",
    schermKeuze: "Schermgrootte",
    frameTitel: (b: string) => `Voorbeeldwebsite van ${b} met AVA`,
  },
} as const;

/** Props that keep the machine translator off text we wrote by hand. */
export const handgeschreven = (taal: RouteTaal) => (taal === "nl" ? { "data-notranslate": "" } : {});
