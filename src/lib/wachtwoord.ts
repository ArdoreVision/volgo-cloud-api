// Password rules shared by the browser (live feedback) and the server (final check).

const VEELGEBRUIKT = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "11111111", "00000000",
  "iloveyou", "letmein1", "welcome1", "admin123", "abcd1234", "abc12345", "football", "baseball", "sunshine", "princess", "trustno1", "superman",
  "whatever", "dragon123", "monkey123", "master123", "shadow123", "michael1", "jennifer", "computer", "internet", "volgo123", "volgo2026", "welkom01",
  "welkom123", "wachtwoord", "wachtwoord1",
]);

export type Sterkte = { score: 0 | 1 | 2 | 3 | 4; label: string; tip: string; ok: boolean };

/** Score 0–4. `ok` means the server will accept it. `context` = words that must not be in the password (name, email, company). */
export function beoordeel(pw: string, context: string[] = []): Sterkte {
  const p = pw ?? "";
  if (!p) return { score: 0, label: "", tip: "At least 8 characters.", ok: false };
  const laag = p.toLowerCase();
  if (p.length < 8) return { score: 1, label: "Too short", tip: `${8 - p.length} more character${8 - p.length === 1 ? "" : "s"}.`, ok: false };
  if (VEELGEBRUIKT.has(laag) || /^(.)\1+$/.test(p) || /^(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf)/i.test(p) && p.length < 12) {
    return { score: 1, label: "Too common", tip: "This one is on every hacker’s list. Pick something personal but unguessable.", ok: false };
  }
  for (const w of context) {
    const woorden = (w ?? "").toLowerCase().split(/[@.\s_-]+/).filter((x) => x.length >= 4);
    if (woorden.some((x) => laag.includes(x))) return { score: 1, label: "Too personal", tip: "Don’t use your name, company or email in your password.", ok: false };
  }
  let punten = 0;
  if (p.length >= 12) punten += 1;
  if (p.length >= 16) punten += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) punten += 1;
  if (/\d/.test(p)) punten += 1;
  if (/[^A-Za-z0-9]/.test(p)) punten += 1;
  if (punten <= 1) return { score: 2, label: "Weak", tip: "Add a few words, a number or a symbol to make it stronger.", ok: true };
  if (punten <= 3) return { score: 3, label: "Good", tip: "Solid. Longer is even better.", ok: true };
  return { score: 4, label: "Strong", tip: "Great password.", ok: true };
}
