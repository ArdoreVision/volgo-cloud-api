import { VOLGO_INSTAGRAM, VOLGO_X } from "@/lib/contact";

import { VolgoMark } from "./logo";

export function Footer() {
  return (
    <footer className="v-footer">
      <a className="v-footer__brand" href="/" style={{ textDecoration: "none" }}>
        <VolgoMark size={20} />
        <span>Volgo</span>
      </a>
      <p>A service by Hanssens Cornerstone Capital · Vlissingen, the Netherlands · KvK 98133438</p>
      <div className="v-footer__rechts">
      <nav aria-label="Footer" className="v-footer__links">
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/dpa">Data Processing Agreement</a>
        <a href="/cookies">Cookies</a>
        <a href="mailto:hanssenscornerstone@outlook.com">Contact</a>
      </nav>
      <div className="v-footer__social">
        <a aria-label="Volgo on Instagram" href={VOLGO_INSTAGRAM} rel="noopener noreferrer" target="_blank" title="Instagram">
          <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24" width="18">
            <rect height="18" rx="5" width="18" x="3" y="3" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" fill="currentColor" r="1.1" stroke="none" />
          </svg>
        </a>
        <a aria-label="Volgo on X" href={VOLGO_X} rel="noopener noreferrer" target="_blank" title="X">
          <svg aria-hidden="true" fill="currentColor" height="15" viewBox="0 0 24 24" width="15">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
      </div>
    </footer>
  );
}
