import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { bindings } from "../bindings.server";
import { hulpBeurt } from "../hulp.server";
import { binnenLimiet } from "../limiet.server";
import { actieveGebruiker } from "../toegang.server";

const invoer = z.object({
  vraag: z.string().trim().min(1).max(1500),
  pagina: z.string().max(30).default("home"),
  historie: z
    .array(z.object({ rol: z.enum(["ik", "volgo"]), tekst: z.string().max(4000) }))
    .max(20)
    .default([]),
});

/** Help in the dashboard: explains Volgo, answers from the account's data, and changes the website and chat on request. */
export const vraagHulp = createServerFn({ method: "POST" })
  .validator((d: unknown) => invoer.parse(d))
  .handler(async ({ data }) => {
    const g = await actieveGebruiker().catch(() => null);
    const { DB } = bindings();
    if (!g || !DB) return { ok: false as const, antwoord: "Je bent uitgelogd. Log opnieuw in om verder te gaan.", acties: [] };
    if (!(await binnenLimiet(DB, `hulp:${g.team_id}`, 60 * 24, 150)))
      return { ok: false as const, antwoord: "Je hebt vandaag het maximum aantal vragen bereikt. Morgen kun je weer verder, of mail volgo.app@outlook.com.", acties: [] };
    return hulpBeurt(DB, { team: g.team_id, naam: g.naam }, data.vraag, data.historie, data.pagina);
  });
