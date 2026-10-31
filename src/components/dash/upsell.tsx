export function Upsell({ tag, titel, tekst, punten, knop }: { tag: string; titel: string; tekst: string; punten: string[]; knop: string }) {
  return (
    <section className="v-upsell">
      <p className="v-upsell__tag">{tag}</p>
      <h2>{titel}</h2>
      <p>{tekst}</p>
      <ul>
        {punten.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <a className="v-btn-blauw" href="/pricing">
        {knop}
      </a>
    </section>
  );
}
