import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/volgo/legal";
import "@/volgo.css";

export const Route = createFileRoute("/voorwaarden")({
  head: () => ({ meta: [{ title: "Algemene voorwaarden · Volgo" }, { name: "description", content: "De algemene voorwaarden van Volgo." }] }),
  component: () => (
    <LegalPage
      bijgewerkt="31 oktober 2026"
      intro={<p>Deze voorwaarden gelden voor elk gebruik van Volgo. Door een abonnement af te sluiten ga je ermee akkoord.</p>}
      titel="Algemene voorwaarden"
    >
      <h2>1. Wie wij zijn</h2>
      <p>
        Volgo is een dienst van Hanssens Cornerstone Capital, gevestigd in Vlissingen en ingeschreven bij de Kamer van Koophandel onder nummer
        98133438 (hierna: "Volgo", "wij"). Deze voorwaarden gelden tussen Volgo en de onderneming die een abonnement afsluit (hierna: "de klant").
        Volgo levert uitsluitend aan ondernemers, niet aan consumenten.
      </p>

      <h2>2. De dienst</h2>
      <p>
        Volgo bouwt en host een website voor de klant met AVA erin: een AI-assistent die met bezoekers chat, vragen beantwoordt, contactgegevens
        vastlegt en leads op warmte sorteert. De klant krijgt toegang tot een online dashboard met gesprekken, leads, agenda, teamchat en
        statistieken. De inhoud van de functies per abonnement staat op de <a href="/abonnement">abonnementenpagina</a>.
      </p>

      <h2>3. Proefperiode, prijzen en betaling</h2>
      <ul>
        <li>Het Start-abonnement begint met een gratis proefperiode van 7 dagen. Zeg je in die periode op, dan betaal je niets.</li>
        <li>Na de proefperiode loopt het abonnement automatisch door tegen het geldende maandbedrag. Prijzen zijn exclusief btw.</li>
        <li>Betaling gebeurt maandelijks vooraf via onze betaalpartner. Bij een mislukte betaling mogen we de dienst na een herinnering opschorten.</li>
        <li>We mogen prijzen eens per jaar aanpassen. We melden dat minstens 30 dagen vooraf; je mag dan opzeggen tegen de ingangsdatum.</li>
      </ul>

      <h2>4. Looptijd en opzeggen</h2>
      <p>
        Een abonnement loopt per maand en is maandelijks opzegbaar, met ingang van de volgende betaalperiode. Opzeggen kan door een mail te sturen
        naar hanssenscornerstone@outlook.com. Na het einde van het abonnement gaat de website offline en verwijderen we de gegevens volgens de
        verwerkersovereenkomst.
      </p>

      <h2>5. Wat we van de klant vragen</h2>
      <ul>
        <li>De klant levert juiste informatie over zijn bedrijf aan, zodat AVA bezoekers goed kan helpen.</li>
        <li>De klant gebruikt Volgo niet voor onwettige doeleinden, spam of misleiding, en houdt inloggegevens geheim.</li>
        <li>De klant is zelf verantwoordelijk voor de afspraken, offertes en prijzen die hij met zijn eigen klanten maakt.</li>
      </ul>

      <h2>6. AVA en AI</h2>
      <p>
        AVA gebruikt kunstmatige intelligentie. Antwoorden worden automatisch gemaakt en kunnen fouten bevatten. AVA is zo ingesteld dat ze geen
        prijzen, levertijden of garanties verzint en eerlijk zegt dat ze een AI is. De klant blijft verantwoordelijk voor de opvolging van leads en voor
        wat met zijn eigen klanten wordt afgesproken.
      </p>

      <h2>7. Beschikbaarheid</h2>
      <p>
        We doen ons best om Volgo altijd bereikbaar te houden, maar kunnen geen ononderbroken werking garanderen. Gepland onderhoud doen we zoveel
        mogelijk buiten kantooruren.
      </p>

      <h2>8. Aansprakelijkheid</h2>
      <p>
        Onze aansprakelijkheid is beperkt tot directe schade en tot maximaal het bedrag dat de klant in de drie maanden voor de schade aan Volgo heeft
        betaald. We zijn niet aansprakelijk voor indirecte schade, zoals gemiste omzet of gemiste leads. Deze beperking geldt niet bij opzet of grove
        schuld.
      </p>

      <h2>9. Intellectueel eigendom</h2>
      <p>
        Teksten, logo's en afbeeldingen die de klant aanlevert blijven van de klant. De software, het dashboard en AVA blijven van Volgo. De klant krijgt
        zolang het abonnement loopt een gebruiksrecht.
      </p>

      <h2>10. Privacy</h2>
      <p>
        Voor gegevens van de klant zelf geldt onze <a href="/privacy">privacyverklaring</a>. Voor gegevens van bezoekers van de website van de klant
        zijn wij verwerker en geldt de <a href="/verwerkersovereenkomst">verwerkersovereenkomst</a>. Die maakt deel uit van deze voorwaarden.
      </p>

      <h2>11. Toepasselijk recht</h2>
      <p>
        Op deze voorwaarden is Nederlands recht van toepassing. Geschillen leggen we voor aan de bevoegde rechter in het arrondissement Zeeland-West-Brabant.
        We wijzigen deze voorwaarden alleen met minstens 30 dagen aankondiging.
      </p>
    </LegalPage>
  ),
});
