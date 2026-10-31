const faqs = [
  { q: "What does it cost?", a: "Start is €149.95, Pro €499.99 and Premium €999.99 per month, excluding VAT. Every plan starts with 7 days free; a payment card is required, and nothing is charged until the trial ends. Switch plans any time, cancel any month." },
  { q: "What's the difference between the plans?", a: "Start: 300 AVA conversations a month for one user. Pro: 1,000 conversations, 5 users, team chat and video calls, AVA trained on your services and prices, 90-day analytics. Premium: 5,000 conversations, unlimited users, AVA on multiple websites, a monthly coaching call and VIP WhatsApp support." },
  { q: "Do I need to do anything technical?", a: "No. AVA goes on your website with one line of code, which we're happy to add for you. You only tell AVA about your business in your dashboard, which takes about two minutes." },
  { q: "Does it work with my website?", a: "Yes. AVA works on any website: WordPress, Wix, Shopify, Squarespace or custom built. You keep your site exactly as it is." },
  { q: "Does AVA sound like a robot?", a: "AVA writes short, friendly messages in your visitor's own language, and honestly says it's an AI when asked. It never makes up prices or promises; it passes those questions to you." },
  { q: "What happens if I go over my conversations?", a: "Nothing gets lost. AVA keeps answering and capturing leads in basic mode, and you see your usage in your dashboard. Upgrade any time for more smart conversations." },
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
