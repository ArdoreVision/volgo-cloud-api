import { getCookie } from "@tanstack/react-start/server";

/**
 * Temporary test pricing (14 Nov 2026): the owner can walk through the real checkout for €0.
 * Only a browser that opened the private test link gets it; everyone else pays the normal price.
 * Only the hash of the code is stored here, and it stops working by itself after TOT.
 */
export const TEST_COOKIE = "volgo_test";
const CODE_HASH = "769ae1a2b1d79646b27278c977fa755ec15b0b4f0215a63569e4d0f471ad4b7b";
const TOT = Date.parse("2026-11-17T00:00:00+01:00");

export async function isTestCode(code: string) {
  if (!code || code.length > 64 || Date.now() > TOT) return false;
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  const hex = [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === CODE_HASH;
}

/** True when this visitor opened the private test link: checkout then charges €0. */
export async function testPrijs() {
  try {
    return await isTestCode(getCookie(TEST_COOKIE) ?? "");
  } catch {
    return false;
  }
}
