import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { INBOX, hashIp, recentCount, saveAndMail } from "../aanvraag.server";

const schema = z.object({
  naam: z.string().trim().min(2).max(100),
  bedrijf: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  telefoon: z.string().trim().max(30).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  branche: z.string().trim().max(60).optional().default(""),
  wens: z.string().trim().max(60).optional().default(""),
  bericht: z.string().trim().max(2000).optional().default(""),
  toestemming: z.literal(true),
  hp: z.string().max(0).optional().default(""),
  ms: z.number().optional().default(0),
});

export const verstuurAanvraag = createServerFn({ method: "POST" })
  .validator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    if (data.hp || (data.ms > 0 && data.ms < 3000)) return { ok: true as const, mailed: true, inbox: INBOX };
    const ipHash = await hashIp(getRequestHeader("cf-connecting-ip") ?? "onbekend");
    if ((await recentCount("aanvragen", ipHash, 60)) >= 5) {
      return { ok: false as const, message: "You’ve already sent a few requests. Please try again later." };
    }
    const { mailed } = await saveAndMail({ ...data, bron: "formulier" }, ipHash);
    return { ok: true as const, mailed, inbox: INBOX };
  });
