const faqs = [
  { q: "Wat kost het?", a: "Dat hangt af van wat je nodig hebt. In de gratis demo laten we zien wat Volgo voor jouw bedrijf doet en krijg je een vaste prijs, zonder verrassingen achteraf." },
  { q: "Moet ik zelf iets technisch doen?", a: "Nee. Wij bouwen de website, koppelen AVA aan je e-mail of WhatsApp en houden alles bij. Jij keurt alleen de toon van de berichten goed." },
  { q: "Kan ik mijn huidige website houden?", a: "Vaak wel. Dan bouwen we AVA in je bestaande site. Is je site verouderd, dan adviseren we eerlijk om hem te vernieuwen." },
  { q: "Klinkt AVA niet als een robot?", a: "AVA schrijft in jouw toon en stelt alleen de vragen die jij belangrijk vindt. Wil een klant een mens spreken, dan krijg jij direct een seintje." },
  { q: "Hoe zit het met privacy?", a: "Gegevens van je klanten worden alleen gebruikt om de aanvraag op te volgen. We leggen de afspraken vast in een verwerkersovereenkomst." },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-titel" className="v-faq" id="vragen">
      <h2 className="v-h2" id="faq-titel">
        Vragen.
      </h2>
      <div className="v-faq__list">
        {faqs.map((f) => (
          <details className="v-faq__item" key={f.q}>
            <summary>
              <span>{f.q}</span>
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
