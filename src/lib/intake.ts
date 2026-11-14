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
  kleur: z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/)]).default(""),
  extra: z.string().trim().max(1500).default(""),
});
export type Intake = z.infer<typeof intakeSchema>;
