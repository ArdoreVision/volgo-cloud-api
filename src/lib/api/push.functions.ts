import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function sessie() {
  const { actieveGebruiker } = await import("../toegang.server");
  const { bindings } = await import("../bindings.server");
  const g = await actieveGebruiker().catch(() => null);
  const { DB } = bindings();
  if (!g || !DB) throw new Error("Not logged in");
  return { g, DB };
}

/** Public VAPID key the browser needs to subscribe. */
export const haalPushSleutel = createServerFn({ method: "GET" }).handler(async () => {
  const { DB } = await sessie();
  const { vapid } = await import("../webpush.server");
  return { sleutel: (await vapid(DB)).publiek };
});

const abo = z.object({ endpoint: z.string().url().max(800), keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }), apparaat: z.string().max(80).optional() });

export const bewaarPush = createServerFn({ method: "POST" })
  .validator((v: unknown) => abo.parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await DB.prepare(
      "INSERT INTO push_abonnementen (team_id, gebruiker_id, endpoint, p256dh, auth, apparaat) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET team_id = excluded.team_id, gebruiker_id = excluded.gebruiker_id, p256dh = excluded.p256dh, auth = excluded.auth",
    )
      .bind(g.team_id, g.id, data.endpoint, data.keys.p256dh, data.keys.auth, data.apparaat ?? "")
      .run();
    return { ok: true };
  });

export const verwijderPush = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ endpoint: z.string().max(800) }).parse(v))
  .handler(async ({ data }) => {
    const { g, DB } = await sessie();
    await DB.prepare("DELETE FROM push_abonnementen WHERE endpoint = ? AND team_id = ?").bind(data.endpoint, g.team_id).run();
    return { ok: true };
  });

export const testPush = createServerFn({ method: "POST" }).handler(async () => {
  const { g, DB } = await sessie();
  const { pushNaarTeam } = await import("../webpush.server");
  await pushNaarTeam(DB, g.team_id, "Volgo-meldingen staan aan", "Je krijgt hier een melding als iemand chat of boekt.", "/dashboard");
  return { ok: true };
});
