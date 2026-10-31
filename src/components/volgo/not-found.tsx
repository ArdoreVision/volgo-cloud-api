import { Link } from "@tanstack/react-router";

export function VolgoNotFound() {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#ffffff", color: "#111318", fontFamily: "Geist, -apple-system, sans-serif", textAlign: "center" }}>
      <div>
        <p style={{ fontSize: 96, fontWeight: 600, letterSpacing: "-0.06em", margin: 0, lineHeight: 1 }}>404</p>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", margin: "16px 0 8px" }}>Deze pagina bestaat niet.</h1>
        <p style={{ color: "#6b7280", margin: "0 0 28px" }}>Misschien is de link veranderd. Ga terug naar de homepage.</p>
        <Link style={{ display: "inline-block", padding: "14px 26px", borderRadius: 999, background: "#111318", color: "#ffffff", textDecoration: "none", fontWeight: 500 }} to="/">
          Naar Volgo
        </Link>
      </div>
    </div>
  );
}
