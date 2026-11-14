import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";

/**
 * Twilio webhooks for a business's Volgo number.
 *   POST /api/telefoon?stap=inkomend   incoming call → forward to the business's own number (20 s)
 *   POST /api/telefoon?stap=klaar      after forwarding: missed → in the inbox (+ optional text back), answered → logged
 *   POST /api/telefoon?stap=sms        incoming text message → in the inbox
 * Every request must carry a valid X-Twilio-Signature (auth token); otherwise 403.
 */
type Inst = { team_id: number; sleutel: string; bedrijf: string; zakelijk_nummer: string; twilio_nummer: string; sms_terug: number; site_url: string };

export const Route = createFileRoute("/api/telefoon")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const k = await import("@/lib/kanalen.server");
        const url = new URL(request.url);
        const velden = Object.fromEntries([...(await request.formData()).entries()].map(([a, b]) => [a, String(b)]));
        // Twilio signs the public URL it called (behind Cloudflare that is https://thevolgo.app/…).
        const publiek = `https://${request.headers.get("host") ?? url.host}${url.pathname}${url.search}`;
        if (!(await k.twilioHandtekeningKlopt(publiek, velden, request.headers.get("x-twilio-signature")))) return new Response("Forbidden", { status: 403 });
        const { DB } = bindings();
        if (!DB) return k.twiml();
        const naar = k.normNummer(velden.To ?? "");
        const inst = await DB.prepare(
          "SELECT a.team_id, a.sleutel, g.bedrijf, a.zakelijk_nummer, a.twilio_nummer, a.sms_terug, a.site_url FROM ava_instellingen a JOIN gebruikers g ON g.id = a.team_id WHERE a.twilio_nummer = ?",
        )
          .bind(naar)
          .first<Inst>();
        if (!inst) return k.twiml('<Say language="nl-NL">Dit nummer is niet in gebruik.</Say><Hangup/>');
        const van = k.normNummer(velden.From ?? "") || (velden.From ?? "onbekend");
        const stap = url.searchParams.get("stap");
        const { berichtBinnen } = await import("@/lib/inbox.server");

        if (stap === "sms") {
          if (velden.Body?.trim()) await berichtBinnen(DB, inst.team_id, { kanaal: "SMS", van, tekst: velden.Body.trim() });
          return k.twiml();
        }

        if (stap === "inkomend") {
          if (!inst.zakelijk_nummer) {
            await registreer(DB, inst, velden.CallSid, van, "geen-nummer", 0);
            return k.twiml('<Say language="nl-NL">Welkom. We zijn nu niet bereikbaar. We bellen u zo snel mogelijk terug.</Say><Hangup/>');
          }
          const actie = `${url.origin}/api/telefoon?stap=klaar`;
          return k.twiml(`<Dial timeout="20" answerOnBridge="true" callerId="${k.xml(van.startsWith("+") ? van : inst.twilio_nummer)}" action="${k.xml(actie)}" method="POST"><Number>${k.xml(inst.zakelijk_nummer)}</Number></Dial>`);
        }

        if (stap === "klaar") {
          const status = velden.DialCallStatus ?? "failed";
          const duur = Number(velden.DialCallDuration ?? 0) || 0;
          if (status === "completed") {
            await registreer(DB, inst, velden.CallSid, van, "beantwoord", duur);
            return k.twiml();
          }
          await registreer(DB, inst, velden.CallSid, van, "gemist", 0);
          return k.twiml('<Say language="nl-NL">We kunnen nu niet opnemen. We hebben uw nummer en bellen u zo snel mogelijk terug.</Say><Hangup/>');
        }
        return k.twiml();
      },
    },
  },
});

/** Logs the call once (Twilio may retry). Missed calls become a conversation + request; answered calls a note. */
async function registreer(DB: NonNullable<ReturnType<typeof bindings>["DB"]>, inst: Inst, sid: string | undefined, van: string, status: string, duur: number) {
  if (!sid) return;
  const r = await DB.prepare("INSERT OR IGNORE INTO telefoon_oproepen (team_id, call_sid, van, status, duur) VALUES (?, ?, ?, ?, ?)").bind(inst.team_id, sid, van, status, duur).run();
  if (!r.meta?.changes) return;
  const { berichtBinnen } = await import("@/lib/inbox.server");
  const tijd = new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", weekday: "short", hour: "2-digit", minute: "2-digit" });
  const gemist = status !== "beantwoord";
  const res = await berichtBinnen(DB, inst.team_id, {
    kanaal: "Telefoon",
    van,
    tekst: gemist ? `Missed call from ${van} (${tijd}). Call back.` : `Call from ${van} answered (${tijd}, ${Math.max(1, Math.round(duur / 60))} min).`,
    rol: "log",
  });
  await DB.prepare("UPDATE telefoon_oproepen SET gesprek_id = ? WHERE call_sid = ?").bind(res.id, sid).run();
  if (gemist && inst.sms_terug && van.startsWith("+")) {
    const k = await import("@/lib/kanalen.server");
    const link = inst.site_url ? `${inst.site_url.replace(/#.*$/, "")}#volgo-boek` : "";
    const s = await k.stuurSmsVan(inst.twilio_nummer, van, `Hoi! Je belde ${inst.bedrijf}, maar we konden even niet opnemen. We bellen je zo snel mogelijk terug.${link ? ` Liever zelf een moment kiezen? ${link}` : ""}`);
    const { notitie } = await import("@/lib/automatisch.server");
    await notitie(DB, res.id, s.ok ? `Volgo sent ${van} a text that you will call back.` : `Text to ${van} did not work: ${s.fout}`);
  }
}
