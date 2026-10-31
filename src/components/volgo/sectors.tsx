const sectors = ["Heating & plumbing", "Contractors", "Kitchens & bathrooms", "Landscapers", "Roofers", "Painters", "Beauty salons", "Dentists", "Physiotherapists", "Real estate agents", "Law firms", "Coaches"];

export function Sectors() {
  return (
    <section aria-labelledby="who-title" className="v-sectors">
      <h2 className="v-h2 v-center" id="who-title">
        Made for businesses where one customer makes the difference.
      </h2>
      <ul className="v-chips">
        {sectors.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
