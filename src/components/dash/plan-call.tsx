import { useState } from "react";

import { INSTAGRAM, INSTAGRAM_DM, PLAN_WOORD } from "@/lib/contact";

/** Copies PLAN and opens a DM with Volgo on Instagram. Only shown on Pro and Premium. */
export function openPlanDm() {
  try {
    void navigator.clipboard?.writeText(PLAN_WOORD);
  } catch {
    /* clipboard not allowed: the word is shown on screen anyway */
  }
  window.open(INSTAGRAM_DM, "_blank", "noopener");
}

export function PlanCall({ compact = false }: { compact?: boolean }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  return (
    <div className={`v-book${compact ? " is-compact" : ""}`}>
      <span aria-hidden="true" className="v-book__ico">
        <svg fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
          <rect height="18" rx="5" width="18" x="3" y="3" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
        </svg>
      </span>
      <div className="v-book__tekst">
        <strong>Plan a call with the Volgo team</strong>
        <p>
          Send <b className="v-book__woord">{PLAN_WOORD}</b> in a DM to <b>@{INSTAGRAM}</b> on Instagram. We reply in the DM to pick a time. The button copies the word for you, so you only
          paste and send.
        </p>
      </div>
      <button
        className="v-book__knop"
        onClick={() => {
          openPlanDm();
          setGekopieerd(true);
        }}
        type="button"
      >
        {gekopieerd ? `“${PLAN_WOORD}” copied, paste it in the DM` : "Plan a call"}
      </button>
    </div>
  );
}
