// The business details an owner fills in before the dashboard opens. Shared by the form and the server.
import { z } from "zod";

export const intakeSchema = z.object({
  bedrijf: z.string().trim().min(2).max(80),
  watDoetHet: z.string().trim().min(40).max(1500),
  diensten: z.string().trim().max(1500).default(""),
  gebied: z.string().trim().max(200).default(""),
  telefoon: z.string().trim().max(40).default(""),
  email: z.union([z.literal(""), z.string().trim().max(120).email()]).default(""),
  adres: z.string().trim().max(200).default(""),
  openingstijden: z.string().trim().max(300).default(""),
  stijl: z.enum(["licht", "donker"]).default("licht"),
  thema: z.enum(["strak", "warm", "stoer", "luxe", "fris"]).default("strak"),
  // Only used when the plan includes a 3D website.
  drieD: z.boolean().default(true),
  kleur: z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/)]).default(""),
  extra: z.string().trim().max(1500).default(""),
});
export type Intake = z.infer<typeof intakeSchema>;

/** The themes an owner can pick for their website. `stijl` says whether the theme is light or dark. */
export const THEMAS: { id: Intake["thema"]; naam: string; uitleg: string; stijl: Intake["stijl"]; kleuren: [string, string, string]; opdracht: string }[] = [
  { id: "strak", naam: "Clean", uitleg: "White, calm and minimal", stijl: "licht", kleuren: ["#ffffff", "#111111", "#e9e9e9"], opdracht: "clean and minimal: white background, near-black text, lots of white space, thin lines, a modern sans-serif" },
  { id: "warm", naam: "Warm", uitleg: "Soft tones, friendly and personal", stijl: "licht", kleuren: ["#f6efe6", "#3a2a1e", "#c98a4b"], opdracht: "warm and personal: soft cream and sand tones, dark brown text, rounded shapes, a friendly serif for headings" },
  { id: "stoer", naam: "Bold", uitleg: "Dark, strong and direct", stijl: "donker", kleuren: ["#0b0b0b", "#ffffff", "#c8ff3e"], opdracht: "bold and dark: near-black background, white text, very large heavy headings, one bright accent colour, strong contrast" },
  { id: "luxe", naam: "Elegant", uitleg: "Refined, for a premium service", stijl: "donker", kleuren: ["#14110f", "#f3ece2", "#b99a63"], opdracht: "elegant and premium: deep dark background, warm off-white text, a refined serif for headings, thin gold-like accents, generous spacing" },
  { id: "fris", naam: "Fresh", uitleg: "Light and colourful, full of energy", stijl: "licht", kleuren: ["#f4fbf7", "#10261c", "#1fb57a"], opdracht: "fresh and lively: light background with soft colour blocks, a clear green-blue accent, rounded cards, playful but tidy" },
];
