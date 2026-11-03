import { useEffect } from "react";

/** Keeps track of forms with unsaved changes, so the browser (and the dashboard's own tab switch) can warn before leaving. */
let open = 0;
const luisteraars = new Set<() => void>();
const meld = () => luisteraars.forEach((f) => f());

export function heeftOnopgeslagen() {
  return open > 0;
}
export function opOnopgeslagen(f: () => void) {
  luisteraars.add(f);
  return () => luisteraars.delete(f);
}

/** Call with `true` while a form has changes that are not saved yet. */
export function useOnopgeslagen(gewijzigd: boolean) {
  useEffect(() => {
    if (!gewijzigd) return;
    open += 1;
    meld();
    const waarschuw = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", waarschuw);
    return () => {
      open -= 1;
      meld();
      window.removeEventListener("beforeunload", waarschuw);
    };
  }, [gewijzigd]);
}
