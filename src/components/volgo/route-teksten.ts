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
    titel: "Volgo follows up every lead. So you don’t have to.",
    sub: "Volgo is the booking system on your website. It knows your business and your customers, and follows up every lead until there’s a call or an appointment. That part is yours. Everything before it, Volgo does.",
    probeer: "Start 7 days for €1",
    abos: "Try Volgo live first",
    proof: ["7 days for €1", `Then from €${prijs} a month`, "Cancel within 7 days, pay nothing more"],
    navProbeer: "Try Volgo live",
    navKort: "Try Volgo",
    balkAbos: "Plans",
    demoLabel: "Live demo · sample business",
    demoTitel: "Try Volgo yourself, right here.",
    demoIntro: (b: string) =>
      `This is the website of ${b}, a made-up remodeling company in Austin, Texas. Volgo is on it exactly as your visitors would see it. Ask something the way a customer would. No sign-up, no payment.`,
    voorbeeldKop: "Tap a question to try it:",
    vragen: ["How much does a kitchen remodel cost?", "Do you work in Round Rock?", "Can someone come out for a free estimate this week?"],
    openChat: "Open the chat",
    afspraak: "Book an appointment",
    privacy: "This is a sample business: feel free to use made-up details.",
    laden: "Loading the sample website…",
    volScherm: "Full screen",
    sluiten: "Close",
    vervolgKop: "Want Volgo on your website?",
    vervolgTekst: `Start with 7 days for €1. Then from €${prijs} a month. Cancel any time.`,
    vervolgKnop: "See the plans",
    schermKeuze: "Screen size",
    frameTitel: (b: string) => `Sample website of ${b} with Volgo`,
  },
  nl: {
    voorWie: "Voor bedrijven die aanvragen via hun website krijgen: aannemers, installateurs, salons, klinieken en praktijken.",
    titel: "Volgo volgt elke lead op. Zodat jij dat niet hoeft te doen.",
    sub: "Volgo is het boekingssysteem op je website. Het kent je bedrijf en je klanten, en volgt elke lead op tot er een call of afspraak staat. Dat deel is aan jou. Alles daarvoor doet Volgo.",
    probeer: "Start 7 dagen voor €1",
    abos: "Eerst live proberen",
    proof: ["7 dagen voor €1", `Daarna vanaf €${prijs} per maand`, "Binnen 7 dagen opzeggen, verder niets betalen"],
    navProbeer: "Probeer Volgo live",
    navKort: "Probeer Volgo",
    balkAbos: "Abonnementen",
    demoLabel: "Live demo · voorbeeldbedrijf",
    demoTitel: "Probeer Volgo zelf, hier op de pagina.",
    demoIntro: (b: string) =>
      `Dit is de website van ${b}, een verzonnen badkamerbedrijf in Zeeland. Volgo staat erop precies zoals jouw bezoekers haar zouden zien. Stel een vraag zoals een klant dat zou doen. Je hoeft je niet aan te melden en niets te betalen.`,
    voorbeeldKop: "Tik op een vraag om het te proberen:",
    vragen: ["Wat kost een complete badkamer ongeveer?", "Kunnen jullie in maart beginnen? We wonen in Middelburg.", "Kan er iemand langskomen om op te meten?"],
    openChat: "Open de chat",
    afspraak: "Afspraak maken",
    privacy: "Dit is een voorbeeldbedrijf: je kunt gerust verzonnen gegevens gebruiken.",
    laden: "Voorbeeldwebsite laden…",
    volScherm: "Volledig scherm",
    sluiten: "Sluiten",
    vervolgKop: "Wil je Volgo op jouw website?",
    vervolgTekst: `Start met 7 dagen voor €1. Daarna vanaf €${prijs} per maand, maandelijks opzegbaar.`,
    vervolgKnop: "Bekijk de abonnementen",
    schermKeuze: "Schermgrootte",
    frameTitel: (b: string) => `Voorbeeldwebsite van ${b} met Volgo`,
  },
} as const;

/** Props that keep the machine translator off text we wrote by hand. */
export const handgeschreven = (taal: RouteTaal) => (taal === "nl" ? { "data-notranslate": "" } : {});
