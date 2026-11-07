const faqs = [
  { q: "How is Volgo different from a chat widget or a big AI front-desk platform?", a: "A plug-in widget usually collects an email and stops. The big platforms do answer leads, but typically cost $400–800 a month with add-ons, publish no prices and rarely offer a trial. Volgo answers every visitor, scores each lead 0–100, books the appointment in the chat and, on Pro and Premium, builds your website too. Prices are on this page, billed monthly, cancel any time." },
  { q: "How quickly is Volgo live?", a: "Usually within 5 minutes. You paste one line of code on your website (we have a guide for every platform, or we add it for you) and tell Volgo about your services and prices in about two minutes. From that moment Volgo answers your visitors." },
  { q: "When do I pay?", a: "You pay €1 when you choose a plan, for a 7-day trial. After 7 days the full monthly price is charged and your plan renews monthly on the same day. Cancel within the 7 days and you pay nothing more. Cancel any time in your dashboard; it stops at the end of the paid month." },
  { q: "What does it cost?", a: "Start is €147, Pro €497 and Premium €997 per month, excluding VAT. Billed monthly, no setup fee, no long contract. Switch plans any time, cancel any month." },
  { q: "What's the difference between the plans?", a: "Start: 300 Volgo conversations a month for one user. Pro: 1,000 conversations, 5 users, team chat and video calls, Volgo trained on your services and prices, 90-day analytics. Premium: 5,000 conversations, unlimited users, Volgo on multiple websites or locations and the fastest support." },
  { q: "Do I need to do anything technical?", a: "No. Volgo goes on your website with one line of code, which we're happy to add for you. You only tell Volgo about your business in your dashboard, which takes about two minutes." },
  { q: "Can Volgo build my website?", a: "Yes, on Pro and Premium. After you subscribe you open the Website tab and tell us what you want, by chat or in a call. We build your site to measure with photos, video and animations, Volgo built in, and launch it on your own domain. Domain name costs (about €10–20 a year) are not included. Start only includes the Volgo chatbot on your own website." },
  { q: "Does it work with my website?", a: "Yes. Volgo works on any website: WordPress, Wix, Shopify, Squarespace or custom built. You keep your site exactly as it is." },
  { q: "Does Volgo sound like a robot?", a: "Volgo writes short, friendly messages in your visitor's own language, and honestly says it's an AI when asked. It never makes up prices or promises; it passes those questions to you." },
  { q: "What happens if I go over my conversations?", a: "Nothing gets lost. Volgo keeps answering and capturing leads in basic mode, and you see your usage in your dashboard. Upgrade any time for more smart conversations." },
  { q: "How do I know who to call first?", a: "Volgo gives every lead a warmth score from 0 to 100 and shows why. The hottest leads are always on top, you get an email when a hot one comes in, and every morning a short summary tells you who to call first." },
  { q: "How do I cancel?", a: "In your dashboard under Subscription, click Manage subscription. You can cancel any time; Volgo and, on Pro and Premium, the website we built for you stop at the end of your paid period. Your domain name stays yours." },
  { q: "What about privacy?", a: "Visitor details are only used to follow up on their question. We're the processor, you stay in control, and it's all set out in our Data Processing Agreement." },
];

export const FAQS = faqs;

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="v-faq" id="faq">
      <h2 className="v-h2" id="faq-title">
        Questions.
      </h2>
      <div className="v-faq__list">
        {faqs.map((f) => (
          <details className="v-faq__item" data-reveal="" key={f.q}>
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
