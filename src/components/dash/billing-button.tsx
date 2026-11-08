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
          const r = await openBillingPortal().catch(() => ({ ok: false as const, message: "Er ging iets mis. Probeer het opnieuw." }));
          if (r.ok) window.location.href = r.url;
          else {
            setFout(r.message);
            setBezig(false);
          }
        }}
        type="button"
      >
        {bezig ? "Openen…" : "Abonnement beheren"}
      </button>
      <p className="v-muted v-small">Wijzig je kaart, download facturen, wissel of stop je pakket. Veilig via Stripe.</p>
      {fout ? <p className="v-err">{fout}</p> : null}
    </div>
  );
}
