const faqs = [
  { q: "What does it cost?", a: "Start is €149.95 per month and begins with 7 days free. Pro is €499.99 and Premium €999.99 per month. Prices exclude VAT, you can switch plans any time and cancel any month." },
  { q: "What's the difference between the plans?", a: "Start is just for you: AVA on your website and the full lead dashboard. Pro adds team chat and video calls for up to 5 users, AVA trained on all your services and prices, and a monthly review. Premium gives your whole team full access with unlimited users, AVA on multiple websites or locations and a dedicated account manager." },
  { q: "Do I need to do anything technical?", a: "No. AVA goes on your website with one line of code, which we're happy to add for you. You only tell AVA about your business in your dashboard, which takes about two minutes." },
  { q: "Does it work with my website?", a: "Yes. AVA works on any website: WordPress, Wix, Shopify, Squarespace or custom built. You keep your site exactly as it is." },
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
