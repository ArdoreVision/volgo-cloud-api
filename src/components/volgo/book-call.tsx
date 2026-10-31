import { BOEK_WOORD, INSTAGRAM, INSTAGRAM_DM } from "@/lib/contact";

/** "Book a call": send BOOK in an Instagram DM first. */
export function BookCall({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`v-book${compact ? " is-compact" : ""}`}>
      <span className="v-book__ico" aria-hidden="true">
        <svg fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
          <rect height="18" rx="5" width="18" x="3" y="3" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
        </svg>
      </span>
      <div className="v-book__tekst">
        <strong>Book a call with the Volgo team</strong>
        <p>
          Pick a free moment in the calendar in our chat, it takes 3 short steps. Prefer Instagram? Send <b className="v-book__woord">{BOEK_WOORD}</b> in a DM to <b>@{INSTAGRAM}</b>.
        </p>
      </div>
      <a className="v-book__knop" data-ava-book="" href={INSTAGRAM_DM} rel="noopener noreferrer" target="_blank">
        Book a call
      </a>
    </div>
  );
}
