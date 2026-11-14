import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { VolgoMark } from "@/components/volgo/logo";
import { AdminReviews } from "@/components/dash/admin-reviews";
import { KlantBeheer } from "@/components/dash/klant-beheer";
import { haalAdmin, haalOmzet, zetAanvraagStatus } from "@/lib/api/admin.functions";
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
const euro = (n: number) => `€${n.toLocaleString("nl-NL", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
type Omzet = Awaited<ReturnType<typeof haalOmzet>>;
const KLEUR: Record<string, string> = { actief: "v-badge--groen", proef: "v-badge--blauw", verlopen: "v-badge--rood" };

function Admin() {
  const d = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<"omzet" | "aanvragen" | "klanten">("klanten");
  const [klant, setKlant] = useState<number | null>(null);
  const [omzet, setOmzet] = useState<Omzet | undefined>(undefined);
  useEffect(() => {
    haalOmzet()
      .then(setOmzet)
      .catch(() => setOmzet({ ok: false as const, message: "Couldn't load revenue from Stripe right now." }));
  }, []);
  const o = omzet && omzet.ok ? omzet : null;
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
            <span>Monthly recurring (Stripe)</span>
            <strong>{o ? euro(o.mrr) : "…"}</strong>
          </div>
          <div>
            <span>Open website requests</span>
            <strong>{d.cijfers.openAanvragen}</strong>
          </div>
        </section>

        <nav className="v-instel__nav" aria-label="Admin">
          <button aria-current={tab === "omzet" ? "page" : undefined} onClick={() => setTab("omzet")} type="button">
            Revenue
          </button>
          <button aria-current={tab === "aanvragen" ? "page" : undefined} onClick={() => setTab("aanvragen")} type="button">
            Website requests{d.cijfers.openAanvragen ? ` (${d.cijfers.openAanvragen})` : ""}
          </button>
          <button aria-current={tab === "klanten" ? "page" : undefined} onClick={() => setTab("klanten")} type="button">
            Customers
          </button>
        </nav>

        {klant ? <KlantBeheer id={klant} sluit={() => setKlant(null)} /> : null}
        {klant ? null : tab === "omzet" ? (
          <section className="v-admin__omzet">
            {omzet === undefined ? <p className="v-feed__empty">Loading revenue from Stripe…</p> : null}
            {omzet && !omzet.ok ? <p className="v-err">{omzet.message}</p> : null}
            {o ? (
              <>
                {!o.live ? <p className="v-admin__test">Stripe is in test mode: these are test payments, not real money. Add your live key to see real revenue.</p> : null}
                <div className="v-admin__omzetcijfers">
                  <div className="is-groot">
                    <span>Revenue this month</span>
                    <strong>{euro(o.dezeMaand)}</strong>
                  </div>
                  <div>
                    <span>Total revenue</span>
                    <strong>{euro(o.totaal)}</strong>
                  </div>
                  <div>
                    <span>Paying subscriptions</span>
                    <strong>{o.betalend}</strong>
                    <small>{euro(o.mrr)} per month</small>
                  </div>
                  <div>
                    <span>In trial (€1)</span>
                    <strong>{o.inProef}</strong>
                    <small>{euro(o.naProef)} per month after trial</small>
                  </div>
                  {o.achterstand ? (
                    <div className="is-rood">
                      <span>Payment failed</span>
                      <strong>{o.achterstand}</strong>
                      <small>Stripe retries automatically</small>
                    </div>
                  ) : null}
                </div>
                <div className="v-dash__panel">
                  <h2 className="v-admin__h2">Payments</h2>
                  {o.betalingen.length === 0 ? <p className="v-feed__empty">No payments yet. The first payment comes in when a customer's 7-day trial ends.</p> : null}
                  <div className="v-admin__tabel">
                    {o.betalingen.length ? (
                      <div className="v-admin__rij v-admin__rij--betaal v-admin__rij--kop">
                        <span>Customer</span>
                        <span>Plan</span>
                        <span>Amount</span>
                        <span>Paid on</span>
                        <span>Invoice</span>
                      </div>
                    ) : null}
                    {o.betalingen.map((b) => (
                      <div className="v-admin__rij v-admin__rij--betaal" key={b.id}>
                        <span>
                          <strong>{b.bedrijf}</strong>
                          <small>{b.email}</small>
                        </span>
                        <span>{b.plan}</span>
                        <span>
                          <strong>{euro(b.bedrag)}</strong>
                        </span>
                        <span>{new Date(b.betaald).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" })}</span>
                        <span>
                          {b.factuur ? (
                            <a className="v-admin__link" href={b.factuur} rel="noopener noreferrer" target="_blank">
                              {b.nummer || "View"}
                            </a>
                          ) : (
                            b.nummer
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </section>
        ) : tab === "aanvragen" ? (
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
                <div
                  className="v-admin__rij v-admin__rij--klik"
                  key={k.id}
                  onClick={() => setKlant(k.id)}
                  onKeyDown={(e) => (e.key === "Enter" ? setKlant(k.id) : undefined)}
                  role="button"
                  tabIndex={0}
                >
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
                    {isPlan(k.plan) ? ` / ${PLANS[k.plan].limieten.gesprekken ?? "∞"}` : ""}
                  </span>
                  <span>{k.leads}</span>
                  <span>{k.leden + 1}</span>
                  <span>{datum(k.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <AdminReviews />
      </main>
    </div>
  );
}
