import { VolgoMark } from "./logo";

export function Footer() {
  return (
    <footer className="v-footer">
      <a className="v-footer__brand" href="/" style={{ textDecoration: "none" }}>
        <VolgoMark size={20} />
        <span>Volgo</span>
      </a>
      <p>A service by Hanssens Cornerstone Capital · Vlissingen, the Netherlands · KvK 98133438</p>
      <nav aria-label="Footer" className="v-footer__links">
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/dpa">Data Processing Agreement</a>
        <a href="/cookies">Cookies</a>
        <a href="mailto:hanssenscornerstone@outlook.com">Contact</a>
      </nav>
    </footer>
  );
}
