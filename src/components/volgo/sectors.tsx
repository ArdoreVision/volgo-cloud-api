const sectors = ["Installateurs", "Aannemers", "Badkamer- en keukenzaken", "Hoveniers", "Dakdekkers", "Schilders", "Schoonheidssalons", "Tandartsen", "Fysiotherapeuten", "Makelaars", "Advocaten", "Coaches"];

export function Sectors() {
  return (
    <section aria-labelledby="wie-titel" className="v-sectors">
      <h2 className="v-h2 v-center" id="wie-titel">
        Gemaakt voor bedrijven waar één klant het verschil maakt.
      </h2>
      <ul className="v-chips">
        {sectors.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
