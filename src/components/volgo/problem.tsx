const pains = [
  { k: "Te laat teruggebeld", t: "Een klant vraagt een offerte aan en belt intussen de concurrent. Wie het eerst reageert, wint meestal." },
  { k: "Opvolging vergeten", t: "Druk op de bouw of in de winkel, en de aanvraag van dinsdag zakt weg in je mail." },
  { k: "Offertes zonder antwoord", t: "Je stuurt een offerte en hoort niets meer. Niemand die vriendelijk nog even navraagt." },
];

export function Problem() {
  return (
    <section aria-labelledby="pijn-titel" className="v-problem">
      <h2 className="v-h2" id="pijn-titel">
        Elke week glippen er klanten door je vingers.
      </h2>
      <ul className="v-problem__list">
        {pains.map((p) => (
          <li key={p.k}>
            <h3>{p.k}</h3>
            <p>{p.t}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
