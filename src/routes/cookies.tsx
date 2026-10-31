import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/volgo/legal";
import "@/volgo.css";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy · Volgo" }, { name: "description", content: "Which cookies Volgo uses." }] }),
  component: () => (
    <LegalPage
      bijgewerkt="October 31, 2026"
      intro={<p>In short: Volgo doesn’t use tracking or advertising cookies. That’s why you don’t see a cookie banner.</p>}
      titel="Cookie Policy"
    >
      <h2>Which cookies we use</h2>
      <ul>
        <li>
          <strong>volgo_sessie</strong>: keeps you logged in to the dashboard. Only set when you log in, valid for up to 30 days.
          This cookie is strictly necessary and does not require consent.
        </li>
      </ul>
      <h2>Storage in your browser</h2>
      <p>
        The chat with AVA stores an anonymous conversation code in your browser, so your conversation doesn’t disappear when you
        go to another page. This code contains no personal data and is not used to track you.
      </p>
      <h2>What we don’t do</h2>
      <p>No Google Analytics, no Facebook pixel, no ad networks, and we never sell data.</p>
      <p>
        You can read more about how we handle data in our <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalPage>
  ),
});
