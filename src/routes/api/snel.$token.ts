import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "@/lib/bindings.server";
import { esc } from "@/lib/mail.server";

// Quick replies to By Intent team applications: opened from Damien's notification or mail.
// GET shows the choices; POST sends one (also called by the buttons in the ntfy notification).

const pagina = (titel: string, inhoud: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${titel}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#000;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;line-height:1.55;padding:40px 20px}
.w{max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:16px}h1{font-size:20px;font-weight:400}.m{opacity:.55;font-size:12px}
button{width:100%;text-align:left;font:inherit;color:#000;background:#fff;border:1px solid #fff;padding:14px 16px;cursor:pointer}button:active{opacity:.7}
button small{display:block;opacity:.6;font-size:11px;margin-top:4px}textarea{width:100%;min-height:96px;background:#0b0b0b;color:#fff;border:1px solid #333;padding:12px;font:inherit}
.box{border:1px solid #333;padding:14px;white-space:pre-wrap;font-size:13px}form{display:flex;flex-direction:column;gap:8px}a{color:#fff}</style></head>
<body><div class="w">${inhoud}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

async function check(token: string, s: string | null) {
  const { teken } = await import("@/lib/snel.server");
  return Boolean(s) && s === (await teken(token));
}

export const Route = createFileRoute("/api/snel/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { DB } = bindings();
        const s = new URL(request.url).searchParams.get("s");
        if (!DB || !(await check(params.token, s))) return pagina("Not found", "<h1>This link doesn't work.</h1>", 404);
        const { aanmelder, KEUZES } = await import("@/lib/snel.server");
        const a = await aanmelder(DB, params.token);
        if (!a) return pagina("Not found", "<h1>Application not found.</h1>", 404);
        const knoppen = Object.entries(KEUZES)
          .map(([k, v]) => `<button name="k" value="${k}">${esc(v.label)}<small>${esc(v.tekst(a.voornaam))}</small></button>`)
          .join("");
        return pagina(
          `Reply to ${a.naam}`,
          `<p class="m">${esc(a.onderwerp)}</p>
           <h1>Let ${esc(a.voornaam)} know</h1>
           <p class="m">One tap sends an email to ${esc(a.email || "(no email)")} from you.</p>
           ${a.laatst ? `<p class="m">Last sent:</p><div class="box">${esc(a.laatst)}</div>` : ""}
           <form method="post">${knoppen}</form>
           <form method="post"><p class="m" style="margin-top:12px">Or write your own message</p><textarea name="tekst" maxlength="1500">Hi ${esc(a.voornaam)}, </textarea><button>Send</button></form>
           <p class="m"><a href="/dashboard#gesprekken">Open in Volgo</a></p>`,
        );
      },
      POST: async ({ request, params }) => {
        const { DB } = bindings();
        const url = new URL(request.url);
        const html = (request.headers.get("content-type") ?? "").includes("form");
        const antwoord = (ok: boolean, tekst: string) =>
          html
            ? pagina(ok ? "Sent" : "Not sent", `<h1>${ok ? "Sent ✓" : "Not sent"}</h1><div class="box">${esc(tekst)}</div><p class="m"><a href="${esc(url.pathname + url.search.replace(/&k=\w+/, ""))}">Back</a></p>`, ok ? 200 : 400)
            : new Response(ok ? "Sent" : "Not sent", { status: ok ? 200 : 400 });
        if (!DB || !(await check(params.token, url.searchParams.get("s")))) return antwoord(false, "This link doesn't work.");
        const { aanmelder, isKeuze, KEUZES, stuurSnel } = await import("@/lib/snel.server");
        const a = await aanmelder(DB, params.token);
        if (!a) return antwoord(false, "Application not found.");
        let k = url.searchParams.get("k") ?? "";
        let eigen = "";
        if (html) {
          const f = await request.formData();
          k = String(f.get("k") ?? k);
          eigen = String(f.get("tekst") ?? "").trim().slice(0, 1500);
        }
        const eigenOk = eigen.replace(/^hi\s+\S+,?\s*/i, "").length >= 3;
        const tekst = isKeuze(k) ? KEUZES[k].tekst(a.voornaam) : eigenOk ? eigen : "";
        if (!tekst) return antwoord(false, "Write a message or pick one of the buttons.");
        const ok = await stuurSnel(DB, a, tekst);
        return antwoord(ok, ok ? `To ${a.email}:\n\n${tekst}` : "The email could not be sent. Try again in a minute.");
      },
    },
  },
});
