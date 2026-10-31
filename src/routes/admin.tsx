import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { VolgoMark } from "@/components/volgo/logo";
import { haalAdmin, zetAanvraagStatus } from "@/lib/api/admin.functions";
import { PLANS, isPlan } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const d = await haalAdmin();
    if (!d) throw redirect({ to: "/login", search: {} });
    return d;
  },
  head: () => ({ meta: [{ title: "Admin · Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

const STATUS: [string, string][] = [
  ["ontvangen", "Request received"],
  ["in_gesprek", "Planning together"],
  ["in_aanbouw", "Building"],
  ["review", "Customer review"],
  ["live", "Live"],
];
const datum = (s: string | null) =>
  s ? new Date(s.replace(" ", "T") + "Z").toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }) : "—";
const KLEUR: Record<string, string> = { actief: "v-badge--groen", proef: "v-badge--blauw", verlopen: "v-badge--rood" };

function Admin() {
  const d = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<"aanvragen" | "klanten">(d.cijfers.openAanvragen ? "aanvragen" : "klanten");
  const [zoek, setZoek] = useState("");
  const klanten = d.klanten.filter((k) => `${k.bedrijf} ${k.email} ${k.naam}`.toLowerCase().includes(zoek.toLowerCase()));

  return (
    <div className="volgo v-admin">
      <header className="v-admin__top">
        <a className="v-nav__brand" href="/dashboard">
          <VolgoMark />
          <span>Volgo admin</span>
        </a>
        <a className="v-dash__logout" href="/dashboard">
          My dashboard
        </a>
      </header>
      <main className="v-admin__main">
        <section className="v-admin__cijfers">
          <div>
            <span>Customers</span>
            <strong>{d.cijfers.totaal}</strong>
          </div>
          <div>
            <span>In trial</span>
            <strong>{d.cijfers.proef}</strong>
          </div>
          <div>
            <span>Paying</span>
            <strong>{d.cijfers.actief}</strong>
          </div>
          <div>
            <span>Expired</span>
            <strong>{d.cijfers.verlopen}</strong>
          </div>
          <div>
            <span>Monthly revenue</span>
            <strong>€{d.cijfers.mrr.toLocaleString("en-GB", { maximumFractionDigits: 0 })}</strong>
          </div>
          <div>
            <span>Open website requests</span>
            <strong>{d.cijfers.openAanvragen}</strong>
          </div>
        </section>

        <nav className="v-instel__nav" aria-label="Admin">
          <button aria-current={tab === "aanvragen" ? "page" : undefined} onClick={() => setTab("aanvragen")} type="button">
            Website requests
          </button>
          <button aria-current={tab === "klanten" ? "page" : undefined} onClick={() => setTab("klanten")} type="button">
            Customers
          </button>
        </nav>

        {tab === "aanvragen" ? (
          <div className="v-admin__lijst">
            {d.aanvragen.length === 0 ? <p className="v-feed__empty">No website requests yet.</p> : null}
            {d.aanvragen.map((w) => (
              <article className="v-dash__panel v-admin__aanvraag" key={w.id}>
                <header>
                  <div>
                    <h2>{w.bedrijf}</h2>
                    <p className="v-muted v-small">
                      {w.naam} · <a href={`mailto:${w.email}`}>{w.email}</a>
                      {w.telefoon ? (
                        <>
                          {" "}
                          · <a href={`tel:${w.telefoon}`}>{w.telefoon}</a>
                        </>
                      ) : null}{" "}
                      · {isPlan(w.plan) ? PLANS[w.plan].naam : w.plan} · {datum(w.created_at)}
                    </p>
                  </div>
                  <select
                    aria-label="Status"
                    className="v-select"
                    onChange={async (e) => {
                      await zetAanvraagStatus({ data: { id: w.id, status: e.target.value as "ontvangen" } });
                      await router.invalidate();
                    }}
                    value={w.status}
                  >
                    {STATUS.map(([id, l]) => (
                      <option key={id} value={id}>
                        {l}
                      </option>
                    ))}
                  </select>
                </header>
                <p className="v-admin__meta">
                  Wants: <strong>{w.contact === "call" ? "a call" : "chat / email"}</strong>
                  {w.domein ? ` · domain: ${w.domein}` : " · no domain yet"}
                  {w.huidige_site ? ` · current site: ${w.huidige_site}` : ""}
                </p>
                <p className="v-website__wensen">{w.wensen}</p>
              </article>
            ))}
          </div>
        ) : (
          <section className="v-dash__panel">
            <input className="v-admin__zoek" onChange={(e) => setZoek(e.target.value)} placeholder="Search by company, name or email" value={zoek} />
            <div className="v-admin__tabel">
              <div className="v-admin__rij v-admin__rij--kop">
                <span>Company</span>
                <span>Plan</span>
                <span>Status</span>
                <span>Chats this month</span>
                <span>Leads</span>
                <span>Users</span>
                <span>Joined</span>
              </div>
              {klanten.map((k) => (
                <div className="v-admin__rij" key={k.id}>
                  <span>
                    <strong>{k.bedrijf}</strong>
                    <small>
                      {k.naam} · {k.email}
                    </small>
                  </span>
                  <span>{isPlan(k.plan) ? PLANS[k.plan].naam : k.plan}</span>
                  <span>
                    <em className={`v-badge ${KLEUR[k.status] ?? ""}`}>
                      {k.status === "proef" ? `Trial until ${datum(k.proef_tot).split(",")[0]}` : k.status === "actief" ? "Paying" : k.status === "verlopen" ? "Expired" : k.status}
                    </em>
                    {k.testmodus ? <small>test</small> : null}
                  </span>
                  <span>
                    {k.gesprekken}
                    {isPlan(k.plan) ? ` / ${PLANS[k.plan].limieten.gesprekken}` : ""}
                  </span>
                  <span>{k.leads}</span>
                  <span>{k.leden + 1}</span>
                  <span>{datum(k.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
