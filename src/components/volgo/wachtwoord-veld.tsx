import { useState } from "react";
import type { KeyboardEvent } from "react";

import { beoordeel } from "@/lib/wachtwoord";

type Props = {
  id: string;
  name: string;
  label: string;
  /** "new" shows the strength meter; "current" is a plain login/confirm field. */
  soort?: "new" | "current";
  /** Words the password must not contain (name, company, email). Only used for soort="new". */
  context?: string[];
  required?: boolean;
  /** Optional link next to the label, e.g. "Forgot?". */
  rechts?: React.ReactNode;
  onChange?: (v: string) => void;
};

/** One password field for the whole app: show/hide, caps-lock warning and (for new passwords) a live strength meter. */
export function WachtwoordVeld({ id, name, label, soort = "current", context = [], required = true, rechts, onChange }: Props) {
  const [toon, setToon] = useState(false);
  const [waarde, setWaarde] = useState("");
  const [caps, setCaps] = useState(false);
  const s = soort === "new" ? beoordeel(waarde, context) : null;
  const keys = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="v-fld">
      {rechts ? (
        <span className="v-fld__row">
          <label htmlFor={id}>{label}</label>
          {rechts}
        </span>
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
      <div className="v-pw">
        <input
          aria-describedby={s ? `${id}-sterkte` : undefined}
          autoComplete={soort === "new" ? "new-password" : "current-password"}
          id={id}
          minLength={soort === "new" ? 8 : undefined}
          name={name}
          onBlur={() => setCaps(false)}
          onChange={(e) => {
            setWaarde(e.target.value);
            onChange?.(e.target.value);
          }}
          onKeyDown={keys}
          onKeyUp={keys}
          required={required}
          spellCheck={false}
          type={toon ? "text" : "password"}
        />
        <button aria-label={toon ? "Hide password" : "Show password"} aria-pressed={toon} className="v-rimpel-uit" onClick={() => setToon(!toon)} type="button">
          {toon ? "Hide" : "Show"}
        </button>
      </div>
      {caps ? (
        <p className="v-hint v-hint--let" role="status">
          Caps Lock is on.
        </p>
      ) : null}
      {s ? (
        <div className="v-sterkte" id={`${id}-sterkte`} role="status">
          <div aria-hidden="true" className={`v-sterkte__balk is-${s.score}`}>
            <i />
            <i />
            <i />
            <i />
          </div>
          <p className="v-hint">
            {s.label ? <b>{s.label} · </b> : null}
            {s.tip}
          </p>
        </div>
      ) : null}
    </div>
  );
}
