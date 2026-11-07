import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/volgo/legal";
import "@/volgo.css";

export const Route = createFileRoute("/dpa")({
  head: () => ({ meta: [{ title: "Data Processing Agreement · Volgo" }, { name: "description", content: "How Volgo processes personal data on behalf of customers (GDPR)." }] }),
  component: () => (
    <LegalPage
      bijgewerkt="October 31, 2026"
      intro={
        <p>
          Volgo talks with visitors to the customer’s website and records personal data in the process. For that data, the customer
          is the controller and Volgo is the processor within the meaning of Article 28 GDPR. This agreement applies automatically
          to every subscription.
        </p>
      }
      titel="Data Processing Agreement"
    >
      <h2>1. Parties</h2>
      <p>
        Processor: Hanssens Cornerstone Capital, trading as Volgo, Vlissingen, the Netherlands, Dutch Chamber of Commerce (KvK)
        no. 98133438. Controller: the business with a Volgo subscription (the customer).
      </p>

      <h2>2. What data, and for what purpose</h2>
      <ul>
        <li><strong>Data subjects:</strong> visitors to the customer’s website who chat with Volgo, and the customer’s team members.</li>
        <li><strong>Data:</strong> the content of the chat, name, phone number and email address if the visitor provides them, the time, and an irreversible code of the IP address to prevent abuse.</li>
        <li><strong>Purpose:</strong> answering visitors’ questions, recording requests, ranking leads and showing them in the customer’s dashboard, and notifying the customer.</li>
      </ul>
      <p>Volgo processes the data only on the customer’s instructions and does not use it for its own purposes or to train AI models.</p>

      <h2>3. Security</h2>
      <ul>
        <li>All connections are encrypted (HTTPS). Passwords are only stored encrypted (hashed).</li>
        <li>Only logged-in members of the customer’s team can see that customer’s conversations and leads.</li>
        <li>Volgo itself only accesses the data when needed for support or maintenance.</li>
      </ul>

      <h2>4. Sub-processors</h2>
      <p>The customer consents to the use of these sub-processors. We’ll announce any change in advance; the customer may then object.</p>
      <ul>
        <li><strong>Cloudflare</strong>: hosting and database for the website and the dashboard.</li>
        <li><strong>Anthropic</strong>: the AI model (Claude) Volgo uses to write replies. Chat text is only passed on to generate a reply.</li>
        <li><strong>Resend</strong>: sending email notifications.</li>
        <li><strong>Stripe</strong>: processing subscription payments (only the customer’s own data).</li>
      </ul>
      <p>Where data is processed outside the EEA, this is done on the basis of the EU-US Data Privacy Framework or Standard Contractual Clauses.</p>

      <h2>5. Retention</h2>
      <p>
        Conversations and leads are kept for as long as the subscription runs, unless the customer deletes them earlier. After the
        subscription ends, we delete them within 30 days, or first hand them over to the customer on request.
      </p>

      <h2>6. Data breaches and requests</h2>
      <ul>
        <li>In the event of a data breach, we inform the customer without undue delay and within 48 hours of discovering it, so the customer can meet its reporting obligation.</li>
        <li>If a visitor asks for access or deletion, we help the customer do so within the legal deadline.</li>
      </ul>

      <h2>7. Audits and confidentiality</h2>
      <p>
        Everyone at Volgo with access to the data is bound by confidentiality. On request, the customer may receive the
        information needed to demonstrate that these agreements are being met.
      </p>
    </LegalPage>
  ),
});
