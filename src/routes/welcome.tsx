import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthShell } from "@/components/volgo/auth-shell";
import { conversie } from "@/components/volgo/tracking";
import { PLANS, isPlan } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/welcome")({
  validateSearch: (s: Record<string, unknown>): { plan?: string; v?: number } => ({
    plan: typeof s.plan === "string" ? s.plan : undefined,
    v: typeof s.v === "number" ? s.v : typeof s.v === "string" && !Number.isNaN(Number(s.v)) ? Number(s.v) : undefined,
  }),
  head: () => ({ meta: [{ title: "Welcome to Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Welcome,
});

const STAPPEN = [
  { t: "Answer five quick questions", d: "So Volgo knows what kind of business you are and how to talk to your customers. Under a minute." },
  { t: "Put Volgo on your website", d: "One line of code, with a guide for every platform. Prefer we do it? Email us from your dashboard and we add it the same day." },
  { t: "Watch the first leads come in", d: "Volgo answers every visitor, collects their details and scores each lead. You get an email for every hot one." },
];

function Welcome() {
  const { plan } = Route.useSearch();
  const p = plan && isPlan(plan) ? PLANS[plan] : null;
  useEffect(() => {
    // Purchase for Meta / Google Ads: only when the signup page just confirmed a real Stripe payment (not on a plain
    // visit to /welcome), once per payment, and only sent once the visitor has accepted tracking.
    try {
      const raw = sessionStorage.getItem("volgo-aankoop");
      if (!raw) return;
      sessionStorage.removeItem("volgo-aankoop");
      const a = JSON.parse(raw) as { id?: string; waarde?: number; plan?: string };
      if (a.id && typeof a.waarde === "number") conversie(a.waarde, a.plan ?? "Volgo", a.id);
    } catch {
      /* private mode */
    }
  }, []);

  return (
    <AuthShell>
      <p className="v-welkom__vink" aria-hidden="true">
        ✓
      </p>
      <h1 className="v-auth__title">Welcome to Volgo{p ? ` ${p.naam}` : ""}.</h1>
      <p className="v-auth__sub">Your payment went through and your dashboard is ready. Here’s what happens next.</p>
      <ol className="v-welkom__stappen">
        {STAPPEN.map((s, i) => (
          <li key={s.t}>
            <span aria-hidden="true">{i + 1}</span>
            <div>
              <strong>{s.t}</strong>
              <p>{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <a className="v-auth__btn" href="/dashboard">
        Open my dashboard →
      </a>
      <p className="v-hint v-welkom__hint">Invoices are under Settings → Subscription in your dashboard. Questions? Write to volgo.app@outlook.com — a real person answers.</p>
    </AuthShell>
  );
}
