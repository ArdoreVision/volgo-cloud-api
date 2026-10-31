import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/volgo/legal";
import "@/volgo.css";

export const Route = createFileRoute("/dpa")({
  head: () => ({ meta: [{ title: "Verwerkersovereenkomst · Volgo" }, { name: "description", content: "Hoe Volgo persoonsgegevens verwerkt voor klanten (AVG)." }] }),
  component: () => (
    <LegalPage
      bijgewerkt="31 oktober 2026"
      intro={
        <p>
          AVA spreekt met bezoekers van de website van de klant en legt daarbij persoonsgegevens vast. Voor die gegevens is de klant
          verwerkingsverantwoordelijke en Volgo verwerker in de zin van artikel 28 AVG. Deze overeenkomst geldt automatisch bij elk abonnement.
        </p>
      }
      titel="Verwerkersovereenkomst"
    >
      <h2>1. Partijen</h2>
      <p>
        Verwerker: Hanssens Cornerstone Capital, handelend onder de naam Volgo, Vlissingen, KvK 98133438. Verwerkingsverantwoordelijke: de onderneming
        met een Volgo-abonnement (de klant).
      </p>

      <h2>2. Welke gegevens en waarvoor</h2>
      <ul>
        <li><strong>Betrokkenen:</strong> bezoekers van de website van de klant die met AVA chatten, en teamleden van de klant.</li>
        <li><strong>Gegevens:</strong> de inhoud van het chatgesprek, naam, telefoonnummer en e-mailadres als de bezoeker die geeft, het tijdstip, en een onomkeerbare code van het IP-adres tegen misbruik.</li>
        <li><strong>Doel:</strong> vragen van bezoekers beantwoorden, aanvragen vastleggen, leads sorteren en tonen in het dashboard van de klant, en de klant daarover informeren.</li>
      </ul>
      <p>Volgo verwerkt de gegevens alleen in opdracht van de klant en gebruikt ze niet voor eigen doeleinden of om AI-modellen mee te trainen.</p>

      <h2>3. Beveiliging</h2>
      <ul>
        <li>Alle verbindingen zijn versleuteld (HTTPS). Wachtwoorden worden alleen versleuteld (gehasht) opgeslagen.</li>
        <li>Alleen ingelogde leden van het team van de klant zien de gesprekken en leads van die klant.</li>
        <li>Toegang door Volgo zelf vindt alleen plaats als dat nodig is voor support of onderhoud.</li>
      </ul>

      <h2>4. Subverwerkers</h2>
      <p>De klant geeft toestemming voor de inzet van deze subverwerkers. Bij een wijziging laten we dat vooraf weten; de klant mag dan bezwaar maken.</p>
      <ul>
        <li><strong>Cloudflare</strong>: hosting en database van de website en het dashboard.</li>
        <li><strong>Anthropic</strong>: het AI-model (Claude) waarmee AVA antwoorden maakt. Gesprekstekst wordt alleen doorgegeven om een antwoord te maken.</li>
        <li><strong>Resend</strong>: het versturen van meldingen per e-mail.</li>
        <li><strong>Stripe</strong>: het verwerken van abonnementsbetalingen (alleen gegevens van de klant zelf).</li>
      </ul>
      <p>Waar gegevens buiten de EER worden verwerkt, gebeurt dat op basis van het EU-VS Data Privacy Framework of standaardcontractbepalingen.</p>

      <h2>5. Bewaartermijn</h2>
      <p>
        Gesprekken en leads blijven bewaard zolang het abonnement loopt, tenzij de klant ze eerder verwijdert. Na het einde van het abonnement
        verwijderen we ze binnen 30 dagen, of geven we ze op verzoek eerst aan de klant mee.
      </p>

      <h2>6. Datalekken en verzoeken</h2>
      <ul>
        <li>Bij een datalek informeren we de klant zonder onnodige vertraging en binnen 48 uur nadat we het ontdekten, zodat de klant zijn meldplicht kan nakomen.</li>
        <li>Vraagt een bezoeker om inzage of verwijdering, dan helpen we de klant om dat binnen de wettelijke termijn te doen.</li>
      </ul>

      <h2>7. Controle en geheimhouding</h2>
      <p>
        Iedereen die bij Volgo toegang heeft tot de gegevens heeft een geheimhoudingsplicht. De klant mag op verzoek informatie krijgen die nodig is om
        aan te tonen dat deze afspraken worden nageleefd.
      </p>
    </LegalPage>
  ),
});
