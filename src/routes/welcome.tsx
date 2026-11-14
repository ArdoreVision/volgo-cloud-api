import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthShell } from "@/components/volgo/auth-shell";
import { conversie } from "@/components/volgo/tracking";
import { PLANS, isPlan, planTitel } from "@/lib/plans";
import "@/volgo.css";

export const Route = createFileRoute("/welcome")({
  validateSearch: (s: Record<string, unknown>): { plan?: string; v?: number } => ({
    plan: typeof s.plan === "string" ? s.plan : undefined,
    v: typeof s.v === "number" ? s.v : typeof s.v === "string" && !Number.isNaN(Number(s.v)) ? Number(s.v) : undefined,
  }),
  head: () => ({ meta: [{ title: "Welcome to Volgo" }, { name: "robots", content: "noindex" }] }),
  component: Welcome,
});

const VRAGEN = { t: "Answer five quick questions", d: "So Volgo knows what kind of business you are and how to talk to your customers. Under a minute." };
const STAPPEN = [
  VRAGEN,
  { t: "Put Volgo on your website", d: "Your dashboard walks you through it step by step, in about 10 minutes. Does someone else manage your website? One button sends them the line." },
  { t: "Watch the first appointments come in", d: "Volgo answers every visitor, asks your questions and lets them pick a time. You get a notification for every appointment." },
];
/** Complete: we build the website, so there is nothing to install. */
const STAPPEN_WEBSITE = [
  VRAGEN,
  { t: "Tell us what you want on your website", d: "Open Website in your dashboard and describe your business, your style and the domain name you want. A few sentences are enough." },
  { t: "We build it, you approve", d: "We build your website with Volgo inside and arrange your domain. Nothing goes live before you say yes." },
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
      <h1 className="v-auth__title">Welcome to {p ? planTitel(p) : "Volgo"}.</h1>
      <p className="v-auth__sub">Your payment went through and your dashboard is ready. Here’s what happens next.</p>
      <ol className="v-welkom__stappen">
        {(p?.limieten.website ? STAPPEN_WEBSITE : STAPPEN).map((s, i) => (
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
