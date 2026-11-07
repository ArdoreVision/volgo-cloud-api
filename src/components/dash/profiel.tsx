import { useEffect, useRef, useState } from "react";

import { openPlanDm } from "./plan-call";

/** Round profile picture, or initials when there is no photo. */
export function ProfielFoto({ naam, foto, maat = 36 }: { naam: string; foto?: string | null; maat?: number }) {
  const letters =
    naam
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  return foto ? (
    <img alt="" className="v-pf" height={maat} src={foto} style={{ width: maat, height: maat }} width={maat} />
  ) : (
    <span aria-hidden="true" className="v-pf v-pf--letters" style={{ width: maat, height: maat, fontSize: Math.round(maat * 0.38) }}>
      {letters}
    </span>
  );
}

/** Resize a chosen image to a 256×256 square JPEG, so it stays small and loads fast. */
export function verkleinFoto(bestand: File): Promise<string> {
  return new Promise((ok, fout) => {
    if (!bestand.type.startsWith("image/")) return fout(new Error("Choose an image (JPG or PNG)."));
    const url = URL.createObjectURL(bestand);
    const img = new Image();
    img.onload = () => {
      const z = 256;
      const c = document.createElement("canvas");
      c.width = z;
      c.height = z;
      const ctx = c.getContext("2d");
      if (!ctx) return fout(new Error("Your browser can't process this image."));
      const kant = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - kant) / 2, (img.height - kant) / 2, kant, kant, 0, 0, z, z);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      fout(new Error("This image couldn't be opened. Try a JPG or PNG."));
    };
    img.src = url;
  });
}

type G = { naam: string; bedrijf: string; email: string; foto?: string; functie?: string };

/** Profile button in the top right with a small menu. */
export function ProfielKnop({
  g,
  planNaam,
  planCall = false,
  admin,
  openTab,
  loguit,
}: {
  g: G;
  planNaam: string;
  planCall?: boolean;
  admin: boolean;
  openTab: (t: string) => void;
  loguit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const klik = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const toets = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", toets);
    };
  }, [open]);
  const ga = (t: string) => {
    setOpen(false);
    openTab(t);
  };

  return (
    <div className="v-profiel" ref={ref}>
      <button aria-expanded={open} aria-haspopup="menu" aria-label="Your profile" className="v-profiel__knop" onClick={() => setOpen(!open)} type="button">
        <ProfielFoto foto={g.foto} maat={38} naam={g.naam} />
      </button>
      {open ? (
        <div className="v-profiel__menu" role="menu">
          <button className="v-profiel__kop" onClick={() => ga("account")} role="menuitem" type="button">
            <ProfielFoto foto={g.foto} maat={48} naam={g.naam} />
            <span>
              <strong>{g.naam}</strong>
              <small>{[g.functie, g.bedrijf].filter(Boolean).join(" · ")}</small>
              <small>{g.email}</small>
            </span>
          </button>
          <button onClick={() => ga("account")} role="menuitem" type="button">
            Profile &amp; account
          </button>
          <button onClick={() => ga("abonnement")} role="menuitem" type="button">
            Subscription <em>{planNaam}</em>
          </button>
          {planCall ? (
            <button
              onClick={() => {
                setOpen(false);
                openPlanDm();
              }}
              role="menuitem"
              type="button"
            >
              Plan a call with Volgo <em>PLAN</em>
            </button>
          ) : null}
          {admin ? (
            <a href="/admin" role="menuitem">
              Volgo admin
            </a>
          ) : null}
          <button className="v-profiel__uit" onClick={loguit} role="menuitem" type="button">
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
