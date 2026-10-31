import { createFileRoute } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Footer } from "@/components/volgo/footer";
import { Nav } from "@/components/volgo/nav";
import "@/volgo.css";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacyverklaring · Volgo" },
      { name: "description", content: "Hoe Volgo omgaat met je gegevens." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="volgo">
      <Nav />
      <main className="v-legal">
        <h1 className="v-h2">Privacyverklaring</h1>
        <p className="v-legal__meta">Laatst bijgewerkt: 30 oktober 2026</p>

        <h2>Wie zijn wij</h2>
        <p>
          Volgo is een dienst van Hanssens Cornerstone Capital, gevestigd in Vlissingen, ingeschreven bij de KvK onder
          nummer 98133438. Wij zijn verantwoordelijk voor de verwerking van je persoonsgegevens via deze website. Vragen?
          Mail naar <a href="mailto:hanssenscornerstone@outlook.com">hanssenscornerstone@outlook.com</a>.
        </p>

        <h2>Welke gegevens we verwerken</h2>
        <ul>
          <li>Wat je invult in het aanvraagformulier: naam, bedrijfsnaam, e-mailadres en, als je die geeft, telefoonnummer, website, branche en je bericht.</li>
          <li>Wat je aan AVA, onze chatassistent, vertelt. Geef je toestemming voor een demo-aanvraag, dan bewaren we je contactgegevens en een korte samenvatting van het gesprek.</li>
          <li>Een versleutelde code van je IP-adres, alleen om misbruik en spam te voorkomen. Uit die code is je IP-adres niet terug te halen.</li>
        </ul>

        <h2>Waarom</h2>
        <p>
          We gebruiken je gegevens alleen om contact met je op te nemen over je aanvraag en om een demo in te plannen.
          De grondslag is je toestemming en het nemen van stappen op jouw verzoek voordat een overeenkomst wordt gesloten.
          We sturen je geen nieuwsbrieven en verkopen je gegevens nooit.
        </p>

        <h2>Wie helpen ons daarbij</h2>
        <ul>
          <li>Hosting en database van deze website: Higgsfield en Cloudflare.</li>
          <li>Het doorsturen van aanvragen naar onze inbox: Resend en FormSubmit.</li>
          <li>De AI achter AVA: Anthropic (Claude). Je chatberichten worden naar Anthropic gestuurd om een antwoord te maken.</li>
        </ul>
        <p>Met deze partijen maken we afspraken over het zorgvuldig verwerken van je gegevens. Sommige verwerken gegevens buiten de EU; dat gebeurt dan met passende waarborgen.</p>

        <h2>Hoe lang</h2>
        <p>Word je geen klant, dan verwijderen we je gegevens uiterlijk 12 maanden na je laatste contact met ons.</p>

        <h2>Jouw rechten</h2>
        <p>
          Je mag je gegevens inzien, laten aanpassen of laten verwijderen, en je toestemming altijd intrekken. Stuur een
          mail naar het adres hierboven, dan reageren we binnen vier weken. Ben je niet tevreden, dan kun je een klacht
          indienen bij de Autoriteit Persoonsgegevens.
        </p>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}
