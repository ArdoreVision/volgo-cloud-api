/** Shared loading / error states, so a failed request never looks like an empty result. */

export function Laden({ tekst = "Loading…" }: { tekst?: string }) {
  return (
    <p aria-busy="true" className="v-laden" role="status">
      <span aria-hidden="true" className="v-laden__ring" />
      {tekst}
    </p>
  );
}

export function Laadfout({ wat = "this", opnieuw }: { wat?: string; opnieuw?: () => void }) {
  return (
    <div className="v-laadfout" role="alert">
      <p>
        <strong>Couldn’t load {wat}.</strong> Check your connection and try again. If it keeps happening, email volgo.app@outlook.com.
      </p>
      {opnieuw ? (
        <button className="v-btn-ghost" onClick={opnieuw} type="button">
          Try again
        </button>
      ) : null}
    </div>
  );
}
