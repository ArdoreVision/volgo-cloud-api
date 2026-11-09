import { type ReactNode, useRef, useState } from "react";

/**
 * A list row you can swipe left, like DMs and mail on a phone:
 * a short swipe shows the actions, a long swipe does the first action (archive) straight away.
 * On a computer the actions appear when you hover the row.
 */
export type SwipeActie = { label: string; icoon: "archief" | "terug" | "wis"; kleur: "grijs" | "rood" | "groen"; doe: () => void };

const ICOON = {
  archief: "M4 7h16v3H4zM5 10v9h14v-9M10 14h4",
  terug: "M9 14l-4-4 4-4M5 10h9a5 5 0 0 1 0 10h-2",
  wis: "M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
};

export function SwipeRij({ acties, children }: { acties: SwipeActie[]; children: ReactNode }) {
  const [x, setX] = useState(0);
  const [open, setOpen] = useState(false);
  const start = useRef<{ x: number; y: number; basis: number } | null>(null);
  const sleept = useRef(false);
  const breed = acties.length * 84;

  function neer(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return; // mouse uses the hover buttons
    start.current = { x: e.clientX, y: e.clientY, basis: open ? -breed : 0 };
    sleept.current = false;
  }
  function beweeg(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!sleept.current) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        start.current = null; // vertical scroll
        return;
      }
      if (Math.abs(dx) < 8) return;
      sleept.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setX(Math.min(0, s.basis + dx));
  }
  function los(e: React.PointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || !sleept.current) return;
    const w = (e.currentTarget as HTMLElement).offsetWidth;
    if (x < -w * 0.55 && acties[0]) {
      setX(-w);
      setTimeout(() => {
        acties[0].doe();
        setX(0);
        setOpen(false);
      }, 180);
    } else if (x < -breed / 2) {
      setX(-breed);
      setOpen(true);
    } else {
      setX(0);
      setOpen(false);
    }
  }

  return (
    <div className={`v-swipe${open ? " is-open" : ""}`}>
      <div className="v-swipe__acties" style={{ width: breed }}>
        {acties.map((a) => (
          <button
            className={`v-swipe__actie v-swipe__actie--${a.kleur}`}
            key={a.label}
            onClick={(e) => {
              e.stopPropagation();
              setX(0);
              setOpen(false);
              a.doe();
            }}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d={ICOON[a.icoon]} />
            </svg>
            {a.label}
          </button>
        ))}
      </div>
      <div
        className="v-swipe__voor"
        onClickCapture={(e) => {
          // A swipe is not a click; a tap on an open row closes it.
          if (sleept.current || open) {
            e.stopPropagation();
            e.preventDefault();
            sleept.current = false;
            if (open) {
              setX(0);
              setOpen(false);
            }
          }
        }}
        onPointerCancel={los}
        onPointerDown={neer}
        onPointerMove={beweeg}
        onPointerUp={los}
        style={{ transform: x ? `translateX(${x}px)` : undefined, transition: start.current ? "none" : undefined }}
      >
        {children}
      </div>
      <div className="v-swipe__hover">
        {acties.map((a) => (
          <button
            aria-label={a.label}
            className={`v-swipe__mini v-swipe__mini--${a.kleur}`}
            key={a.label}
            onClick={(e) => {
              e.stopPropagation();
              a.doe();
            }}
            title={a.label}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d={ICOON[a.icoon]} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
