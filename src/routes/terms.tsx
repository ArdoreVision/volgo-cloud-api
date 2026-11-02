import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/volgo/legal";
import "@/volgo.css";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service · Volgo" }, { name: "description", content: "Volgo's Terms of Service." }] }),
  component: () => (
    <LegalPage
      bijgewerkt="October 31, 2026"
      intro={<p>These terms apply to all use of Volgo. By starting a subscription, you agree to them.</p>}
      titel="Terms of Service"
    >
      <h2>1. Who we are</h2>
      <p>
        Volgo is a service by Hanssens Cornerstone Capital, based in Vlissingen, the Netherlands, and registered with the Dutch
        Chamber of Commerce (KvK) no. 98133438 ("Volgo", "we"). These terms apply between Volgo and the business that starts a
        subscription ("the customer"). Volgo only provides its services to businesses, not to consumers.
      </p>

      <h2>2. The service</h2>
      <p>
        Volgo provides AVA, an AI assistant that the customer adds to their own website with one line of code. AVA chats with visitors, answers
        questions, captures contact details and ranks leads by how warm they are. The customer gets access to an online
        dashboard with conversations, leads, calendar, team chat and analytics. On the Pro and Premium plans, Volgo also builds a
        custom website for the customer with AVA built in, planned together by chat or call, and hosts it for as long as the
        subscription runs. Domain name costs are not included and are paid by the customer. What each plan includes is listed on the{" "}
        <a href="/pricing">pricing page</a>.
      </p>

      <h2>3. Prices and payment</h2>
      <ul>
        <li>You pay the first month when you choose a plan. There is no free trial and no setup fee.</li>
        <li>The subscription renews automatically every month at the current monthly price. Prices exclude VAT.</li>
        <li>Payment is made monthly in advance through our payment partner. If a payment fails, we may suspend the service after a reminder.</li>
        <li>We may adjust prices once a year. We’ll let you know at least 30 days in advance; you may then cancel before the change takes effect.</li>
      </ul>

      <h2>4. Term and cancellation</h2>
      <p>
        A subscription runs month to month and can be canceled monthly, effective from the next billing period. You can cancel
        in your dashboard or by emailing volgo.app@outlook.com. When the subscription ends, AVA stops working on your website
        and, on Pro and Premium, the website built by Volgo goes offline. The domain name stays yours. We delete the data as described in
        the Data Processing Agreement.
      </p>

      <h2>5. What we ask of the customer</h2>
      <ul>
        <li>The customer provides accurate information about their business, so AVA can help visitors properly.</li>
        <li>The customer does not use Volgo for unlawful purposes, spam or deception, and keeps login details secret.</li>
        <li>The customer is responsible for the agreements, quotes and prices they make with their own customers.</li>
      </ul>

      <h2>6. AVA and AI</h2>
      <p>
        AVA uses artificial intelligence. Replies are generated automatically and may contain mistakes. AVA is set up not to make
        up prices, delivery times or guarantees, and to say honestly that it is an AI. The customer remains responsible for
        following up on leads and for what is agreed with their own customers.
      </p>

      <h2>7. Availability</h2>
      <p>
        We do our best to keep Volgo available at all times, but cannot guarantee uninterrupted operation. We schedule planned
        maintenance outside business hours as much as possible.
      </p>

      <h2>8. Liability</h2>
      <p>
        Our liability is limited to direct damage and to no more than the amount the customer paid Volgo in the three months
        before the damage occurred. We are not liable for indirect damage, such as lost revenue or missed leads. This limitation
        does not apply in case of intent or gross negligence.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        Texts, logos and images supplied by the customer remain the customer’s. The software, the dashboard and AVA remain
        Volgo’s. The customer receives a right of use for as long as the subscription runs.
      </p>

      <h2>10. Privacy</h2>
      <p>
        Our <a href="/privacy">Privacy Policy</a> applies to the customer’s own data. For data of visitors to the customer’s
        website, we act as a processor and the <a href="/dpa">Data Processing Agreement</a> applies. It forms part of these terms.
      </p>

      <h2>11. Governing law</h2>
      <p>
        Dutch law applies to these terms. Disputes will be submitted to the competent court in the Zeeland-West-Brabant district.
        We only change these terms with at least 30 days’ notice.
      </p>
    </LegalPage>
  ),
});
