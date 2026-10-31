import { z } from "zod";

/** The content of a customer website. Rendered by /s/$slug. */
export const siteSchema = z.object({
  taal: z.enum(["en", "nl", "de", "fr"]).default("en"),
  kleur: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1677d9"),
  stijl: z.enum(["licht", "donker"]).default("licht"),
  naam: z.string().max(80),
  tagline: z.string().max(140).default(""),
  hero: z.object({ titel: z.string().max(120), tekst: z.string().max(400), knop: z.string().max(40).default("Ask AVA") }),
  diensten: z.array(z.object({ titel: z.string().max(80), tekst: z.string().max(300) })).max(8).default([]),
  over: z.object({ titel: z.string().max(100).default(""), tekst: z.string().max(1200).default("") }).default({ titel: "", tekst: "" }),
  reviews: z.array(z.object({ naam: z.string().max(60), tekst: z.string().max(300) })).max(6).default([]),
  faq: z.array(z.object({ vraag: z.string().max(160), antwoord: z.string().max(500) })).max(8).default([]),
  contact: z
    .object({
      telefoon: z.string().max(40).default(""),
      email: z.string().max(120).default(""),
      adres: z.string().max(200).default(""),
      openingstijden: z.string().max(200).default(""),
    })
    .default({ telefoon: "", email: "", adres: "", openingstijden: "" }),
});
export type SiteData = z.infer<typeof siteSchema>;

export function standaardSite(bedrijf: string, info: string): SiteData {
  return {
    taal: "en",
    kleur: "#1677d9",
    stijl: "licht",
    naam: bedrijf,
    tagline: "",
    hero: {
      titel: `Welcome to ${bedrijf}`,
      tekst: info.trim().slice(0, 300) || "Tell us what you need. Our assistant AVA answers right away, day and night.",
      knop: "Ask AVA",
    },
    diensten: [],
    over: { titel: `About ${bedrijf}`, tekst: "" },
    reviews: [],
    faq: [],
    contact: { telefoon: "", email: "", adres: "", openingstijden: "" },
  };
}

export const slugVan = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "site";

/** Fixed labels on the customer site, in the site's language. */
export const LABELS = {
  en: { services: "Services", about: "About", reviews: "What customers say", faq: "Questions", contact: "Get in touch", phone: "Phone", email: "Email", address: "Address", hours: "Opening hours", call: "Call", fastest: "The fastest way to reach us: ask AVA, our assistant. Answers right away, day and night.", preview: "Preview · this website is not published yet", built: "Built with Volgo" },
  nl: { services: "Diensten", about: "Over ons", reviews: "Wat klanten zeggen", faq: "Veelgestelde vragen", contact: "Contact", phone: "Telefoon", email: "E-mail", address: "Adres", hours: "Openingstijden", call: "Bel", fastest: "De snelste manier om ons te bereiken: vraag het AVA, onze assistent. Antwoord direct, dag en nacht.", preview: "Voorbeeld · deze website is nog niet gepubliceerd", built: "Gemaakt met Volgo" },
  de: { services: "Leistungen", about: "Über uns", reviews: "Das sagen Kunden", faq: "Häufige Fragen", contact: "Kontakt", phone: "Telefon", email: "E-Mail", address: "Adresse", hours: "Öffnungszeiten", call: "Anrufen", fastest: "Am schnellsten erreichen Sie uns über AVA, unsere Assistentin. Antwort sofort, Tag und Nacht.", preview: "Vorschau · diese Website ist noch nicht veröffentlicht", built: "Erstellt mit Volgo" },
  fr: { services: "Services", about: "À propos", reviews: "Avis clients", faq: "Questions fréquentes", contact: "Contact", phone: "Téléphone", email: "E-mail", address: "Adresse", hours: "Horaires", call: "Appeler", fastest: "Le plus rapide : demandez à AVA, notre assistante. Réponse immédiate, jour et nuit.", preview: "Aperçu · ce site n'est pas encore publié", built: "Créé avec Volgo" },
} as const;
