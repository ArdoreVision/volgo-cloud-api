export function Bento() {
  return (
    <section aria-labelledby="wat-titel" className="v-bento-wrap" id="wat">
      <h2 className="v-h2 v-center" id="wat-titel">
        Alles wat je nodig hebt. Niets wat je zelf hoeft te doen.
      </h2>
      <div className="v-bento">
        <article className="v-tile v-tile--site">
          <div className="v-tile__text">
            <h3>Een nieuwe website</h3>
            <p>Snel, strak en gemaakt om aanvragen binnen te halen. Op mobiel net zo goed als op desktop.</p>
          </div>
          <img alt="" height={600} loading="lazy" src="/assets/volgo/website.jpg" width={800} />
        </article>
        <article className="v-tile v-tile--ava">
          <div className="v-tile__text">
            <h3>AVA, je AI-opvolger</h3>
            <p>Beantwoordt, vraagt door en volgt op via e-mail of WhatsApp. Altijd in jouw naam.</p>
          </div>
          <img alt="" height={600} loading="lazy" src="/assets/volgo/meldingen.jpg" width={800} />
        </article>
        <article className="v-tile v-tile--dash">
          <h3>Eén overzicht</h3>
          <p>Zie per klant wat er binnenkwam, wat AVA deed en wie je zelf moet bellen.</p>
        </article>
        <article className="v-tile v-tile--care">
          <h3>Wij regelen alles</h3>
          <p>Bouwen, koppelen, onderhouden. Jij keurt de berichten één keer goed en wij doen de rest.</p>
        </article>
      </div>
    </section>
  );
}
