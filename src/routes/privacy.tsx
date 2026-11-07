import { createFileRoute } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Footer } from "@/components/volgo/footer";
import { Nav } from "@/components/volgo/nav";
import "@/volgo.css";
import "@/volgo-donker.css";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Volgo" },
      { name: "description", content: "How Volgo handles your data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="volgo volgo--donker">
      <Nav />
      <main className="v-legal">
        <h1 className="v-h2">Privacy Policy</h1>
        <p className="v-legal__meta">Last updated: October 31, 2026</p>

        <h2>Who we are</h2>
        <p>
          Volgo is a service by Hanssens Cornerstone Capital, based in Vlissingen, the Netherlands, registered with the Dutch
          Chamber of Commerce (KvK) no. 98133438. We are responsible for processing your personal data through this website.
          Questions? Email <a href="mailto:volgo.app@outlook.com">volgo.app@outlook.com</a>.
        </p>

        <h2>What data we process</h2>
        <ul>
          <li>What you enter in the request form: your name, company name, email address and, if you provide them, phone number, website, industry and message.</li>
          <li>What you tell Volgo, our chat assistant. If you agree to a demo request, we keep your contact details and a short summary of the conversation.</li>
          <li>An encrypted code of your IP address, only to prevent abuse and spam. Your IP address cannot be recovered from this code.</li>
        </ul>

        <h2>Website statistics from Volgo</h2>
        <p>
          On websites where Volgo is installed (including this one), Volgo counts visits so the business can see how its website performs: which pages are viewed,
          for how long and how far down, the website you came from, the type of device, and the country based on your connection. This is done without cookies and
          without storing your IP address. Visitors are counted with a code that changes every day and differs per website, so nobody can be followed across days
          or websites. If your browser asks websites not to track you (Do Not Track or Global Privacy Control), nothing is counted. Statistics are kept for 13
          months.
        </p>
        <p>
          Before you use such a website, Volgo asks for your permission. Only if you accept, Volgo also keeps your approximate location (city, region and
          country, derived from your connection, never your exact address), your device, browser, operating system and language, a random code to
          recognise you when you come back, and which pages you viewed before chatting. The business uses this only to understand its visitors and to help
          you better. You can visit the website either way, and you can change your choice by clearing your browser data for that website.
        </p>

        <h2>Why</h2>
        <p>
          We only use your data to contact you about your request and to schedule a demo. The legal basis is your consent and
          taking steps at your request before entering into a contract. We never send you newsletters and never sell your data.
        </p>

        <h2>Who helps us</h2>
        <ul>
          <li>Hosting and database of this website: Cloudflare.</li>
          <li>Forwarding requests to our inbox: Resend and FormSubmit.</li>
          <li>Payments for subscriptions: Stripe.</li>
          <li>The AI behind Volgo: Anthropic (Claude). Your chat messages are sent to Anthropic to generate a reply.</li>
        </ul>
        <p>We have agreements with these parties to handle your data with care. Some of them process data outside the EU; when that happens, appropriate safeguards are in place.</p>

        <h2>How long</h2>
        <p>If you don’t become a customer, we delete your data no later than 12 months after your last contact with us.</p>

        <h2>Your rights</h2>
        <p>
          You may access, correct or delete your data, and withdraw your consent at any time. Email the address above and we’ll
          respond within four weeks. If you’re not satisfied, you can file a complaint with the Dutch Data Protection Authority
          (Autoriteit Persoonsgegevens).
        </p>
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}
