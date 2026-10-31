import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/volgo/legal";
import "@/volgo.css";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookieverklaring · Volgo" }, { name: "description", content: "Welke cookies Volgo gebruikt." }] }),
  component: () => (
    <LegalPage
      bijgewerkt="31 oktober 2026"
      intro={<p>Kort gezegd: Volgo gebruikt geen tracking- of advertentiecookies. Daarom zie je ook geen cookiemelding.</p>}
      titel="Cookieverklaring"
    >
      <h2>Welke cookies we gebruiken</h2>
      <ul>
        <li>
          <strong>volgo_sessie</strong>: houdt je ingelogd in het dashboard. Alleen gezet als je inlogt, maximaal 30 dagen geldig. Dit cookie is
          noodzakelijk en daarvoor is geen toestemming nodig.
        </li>
      </ul>
      <h2>Opslag in je browser</h2>
      <p>
        De chat met AVA onthoudt in je browser een anonieme gesprekscode, zodat je gesprek niet verdwijnt als je naar een andere pagina gaat. Die code
        bevat geen persoonsgegevens en wordt niet gebruikt om je te volgen.
      </p>
      <h2>Wat we niet doen</h2>
      <p>Geen Google Analytics, geen Facebook-pixel, geen advertentienetwerken en geen verkoop van gegevens.</p>
      <p>
        Meer over hoe we met gegevens omgaan staat in de <a href="/privacy">privacyverklaring</a>.
      </p>
    </LegalPage>
  ),
});
