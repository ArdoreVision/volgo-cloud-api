import "@/volgo-wit.css";

/** Shown instead of the landing page while Volgo is paused. */
export function Pauze() {
  return (
    <main className="volgo vn" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "32px 20px", textAlign: "center" }}>
      <div style={{ maxWidth: 520 }}>
        <p style={{ margin: "0 0 28px", font: "650 20px/1 var(--display)", color: "var(--ink)" }}>Volgo</p>
        <h1 style={{ margin: 0, font: "650 clamp(34px, 7vw, 56px)/1.05 var(--display)", letterSpacing: "-0.03em", color: "var(--ink)" }}>We are taking a break.</h1>
        <p style={{ margin: "18px 0 30px", fontSize: 18, color: "var(--muted)" }}>Volgo is not taking new customers right now. Existing customers can keep using their account as usual.</p>
        <a className="vn-knop" href="/login">
          Log in
        </a>
      </div>
    </main>
  );
}
