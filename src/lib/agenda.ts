// Pure calendar rules, shared by the server (booking) and the dashboard (settings, warnings). No database here.

/** A slot must start at least this many minutes from now (same rule for showing and for booking). */
export const MIN_VOORAF_MIN = 120;
/** The chat calendar shows three weeks; bookings further ahead than this are refused. */
export const MAX_DAGEN_VOORUIT = 28;

/** "09:30" → 570 */
export const minuten = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Slot length on the calendar grid: every 30 minutes for short appointments, otherwise every hour. */
export const slotStap = (duur: number) => (duur <= 30 ? 30 : 60);

/**
 * Opening hours this wide are almost always a mistake or a test (seven days a week, or 16 hours a day or more).
 * The settings page warns about it; nothing is ever changed without the owner doing it.
 */
export function isOngebruikelijkRuim(inst: { open_dagen: string | number[]; open_van: string; open_tot: string }) {
  const dagen = (Array.isArray(inst.open_dagen) ? inst.open_dagen : inst.open_dagen.split(",").filter(Boolean)).length;
  const uren = (minuten(inst.open_tot) - minuten(inst.open_van)) / 60;
  return dagen >= 7 || uren >= 16;
}

/** Hours per week the calendar is open, for the warning text. */
export function openUrenPerWeek(inst: { open_dagen: string | number[]; open_van: string; open_tot: string }) {
  const dagen = (Array.isArray(inst.open_dagen) ? inst.open_dagen : inst.open_dagen.split(",").filter(Boolean)).length;
  return Math.max(0, Math.round(((minuten(inst.open_tot) - minuten(inst.open_van)) / 60) * dagen));
}
