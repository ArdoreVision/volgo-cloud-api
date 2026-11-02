import { describe, expect, it } from "vitest";

import { isOngebruikelijkRuim, openUrenPerWeek, slotStap } from "@/lib/agenda";
import { BETAAL_TEKST, PLANS, plannenVoorAva } from "@/lib/plans";

describe("one source of truth for plans", () => {
  it("tells AVA exactly the prices and limits of the pricing page, and no free trial", () => {
    const t = plannenVoorAva();
    for (const p of Object.values(PLANS)) {
      expect(t).toContain(`${p.naam}: €${p.prijsTekst} per month`);
      expect(t).toContain(`${p.limieten.gesprekken.toLocaleString("en-GB")} AVA conversations/month`);
    }
    expect(t).toContain("unlimited users");
    expect(t).not.toMatch(/free trial first|days free/i);
    expect(BETAAL_TEKST).toMatch(/No free trial/);
    expect(Object.values(PLANS).every((p) => p.proefDagen === 0)).toBe(true);
  });
});

describe("calendar rules", () => {
  it("warns about availability that is almost certainly a mistake", () => {
    expect(isOngebruikelijkRuim({ open_dagen: "1,2,3,4,5", open_van: "08:00", open_tot: "17:00" })).toBe(false);
    expect(isOngebruikelijkRuim({ open_dagen: "0,1,2,3,4,5,6", open_van: "00:00", open_tot: "23:00" })).toBe(true);
    expect(isOngebruikelijkRuim({ open_dagen: [1, 2, 3], open_van: "06:00", open_tot: "22:00" })).toBe(true);
    expect(openUrenPerWeek({ open_dagen: "1,2,3,4,5", open_van: "08:00", open_tot: "17:00" })).toBe(45);
    expect(slotStap(30)).toBe(30);
    expect(slotStap(45)).toBe(60);
  });
});
