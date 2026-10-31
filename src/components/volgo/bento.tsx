export function Bento() {
  return (
    <section aria-labelledby="what-title" className="v-bento-wrap" id="features">
      <h2 className="v-h2 v-center" id="what-title">
        From first question to quote. Without the chasing.
      </h2>
      <div className="v-bento">
        <article className="v-tile v-tile--site">
          <div className="v-tile__text">
            <h3>Your website, or a new one</h3>
            <p>Start: put AVA on your own site with one line of code, on WordPress, Wix, Shopify or anything else. Pro and Premium: we build you a website to measure, with photos, video and AVA inside.</p>
          </div>
          <img alt="" height={600} loading="lazy" src="/assets/volgo/website.jpg" width={800} />
        </article>
        <article className="v-tile v-tile--ava">
          <div className="v-tile__text">
            <h3>Every question answered</h3>
            <p>AVA replies within seconds, 24/7, asks what the job is and collects name and phone or email, always with permission.</p>
          </div>
          <img alt="" height={600} loading="lazy" src="/assets/volgo/meldingen.jpg" width={800} />
        </article>
        <article className="v-tile v-tile--dash">
          <h3>Leads ranked by warmth</h3>
          <p>Every lead gets a score from 0 to 100 with the reason why. The ones ready for a quote are always on top.</p>
        </article>
        <article className="v-tile v-tile--care">
          <h3>Nothing slips through</h3>
          <p>Track every lead from new to quote sent to won. A hot lead lands in your inbox right away, plus a summary every morning.</p>
        </article>
      </div>
    </section>
  );
}
