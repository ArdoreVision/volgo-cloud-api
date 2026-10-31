export function Bento() {
  return (
    <section aria-labelledby="what-title" className="v-bento-wrap" id="features">
      <h2 className="v-h2 v-center" id="what-title">
        Everything you get. Nothing you have to set up.
      </h2>
      <div className="v-bento">
        <article className="v-tile v-tile--site">
          <div className="v-tile__text">
            <h3>A website built for you</h3>
            <p>Fast, clean and made to turn visitors into inquiries. We build it and launch it with AVA inside. Already have a site you love? Add AVA with one line of code.</p>
          </div>
          <img alt="" height={600} loading="lazy" src="/assets/volgo/website.jpg" width={800} />
        </article>
        <article className="v-tile v-tile--ava">
          <div className="v-tile__text">
            <h3>AVA on your site, 24/7</h3>
            <p>Answers questions, asks what people need and collects their name and phone or email, always with permission.</p>
          </div>
          <img alt="" height={600} loading="lazy" src="/assets/volgo/meldingen.jpg" width={800} />
        </article>
        <article className="v-tile v-tile--dash">
          <h3>Leads ranked by warmth</h3>
          <p>Every lead gets a score from 0 to 100. The ones ready to buy are always at the top, with the reason why.</p>
        </article>
        <article className="v-tile v-tile--care">
          <h3>Alerts that matter</h3>
          <p>An email the moment a hot lead comes in, and a short summary every morning: who to call and what&apos;s in your agenda.</p>
        </article>
      </div>
    </section>
  );
}
