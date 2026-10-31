const pains = [
  { k: "Called back too late", t: "Someone asks for a quote and calls your competitor while they wait. Whoever answers first usually wins." },
  { k: "Questions after hours", t: "Most people browse in the evening. Your website stays silent, so they leave without a word." },
  { k: "No idea who to call first", t: "Ten inquiries, one afternoon. Who is ready to buy and who is just looking around?" },
];

export function Problem() {
  return (
    <section aria-labelledby="pain-title" className="v-problem">
      <h2 className="v-h2" id="pain-title">
        Every week, customers slip through your fingers.
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
