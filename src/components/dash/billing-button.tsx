import { useState } from "react";

import { openBillingPortal } from "@/lib/api/billing.functions";

export function BillingButton() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  return (
    <div className="v-billing">
      <button
        className="v-btn-blauw"
        disabled={bezig}
        onClick={async () => {
          setBezig(true);
          setFout("");
          const r = await openBillingPortal().catch(() => ({ ok: false as const, message: "Something went wrong. Please try again." }));
          if (r.ok) window.location.href = r.url;
          else {
            setFout(r.message);
            setBezig(false);
          }
        }}
        type="button"
      >
        {bezig ? "Opening…" : "Manage subscription"}
      </button>
      <p className="v-muted v-small">Change your card, download invoices, switch or stop your plan. Secure via Stripe.</p>
      {fout ? <p className="v-err">{fout}</p> : null}
    </div>
  );
}
