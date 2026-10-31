const faqs = [
  { q: "What does it cost?", a: "Start is €149.95 per month and begins with 7 days free. Pro is €499.99 and Premium €999.99 per month. Prices exclude VAT, you can switch plans any time and cancel any month." },
  { q: "What's the difference between the plans?", a: "Start is just for you: your website, AVA and the dashboard. Pro adds team chat and video calls for up to 5 users, plus AVA trained on all your services and a monthly improvement round. Premium gives your whole team full access with unlimited users and the website builder, so you can change your own site by asking AVA." },
  { q: "Do I need to do anything technical?", a: "No. We build your website with AVA inside. You only tell AVA about your business in your dashboard, which takes about two minutes." },
  { q: "Can I keep my current website?", a: "Yes. Then you add AVA to your existing site with one line of code, which you'll find in your dashboard. We're happy to do it for you." },
  { q: "Does AVA sound like a robot?", a: "AVA writes short, friendly messages in your visitor's own language, and honestly says it's an AI when asked. It never makes up prices or promises; it passes those questions to you." },
  { q: "How do I know who to call first?", a: "AVA gives every lead a warmth score from 0 to 100 and shows why. The hottest leads are always on top, and you get an email when a hot one comes in." },
  { q: "How do I cancel?", a: "In your dashboard under Subscription, click Manage subscription. You can update your card, download invoices or cancel there." },
  { q: "What about privacy?", a: "Visitor details are only used to follow up on their question. We're the processor, you stay in control, and it's all set out in our Data Processing Agreement." },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="v-faq" id="faq">
      <h2 className="v-h2" id="faq-title">
        Questions.
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
