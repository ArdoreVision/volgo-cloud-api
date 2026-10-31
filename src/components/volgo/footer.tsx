import { VolgoMark } from "./logo";

export function Footer() {
  return (
    <footer className="v-footer">
      <a className="v-footer__brand" href="/" style={{ textDecoration: "none" }}>
        <VolgoMark size={20} />
        <span>Volgo</span>
      </a>
      <p>Een dienst van Hanssens Cornerstone Capital · Vlissingen · KvK 98133438</p>
      <nav aria-label="Voettekst" className="v-footer__links">
        <a href="/privacy">Privacy</a>
        <a href="mailto:hanssenscornerstone@outlook.com">Contact</a>
      </nav>
    </footer>
  );
}
