import type { CSSProperties } from "react";

const items = [
  { t: "Home", d: "Ask AVA anything about your business. “Who should I call first today?” “Write a follow-up email to my hottest lead.”", i: "M10 3.5l1.6 4.1 4.4.3-3.4 2.8 1.1 4.3L10 12.6 6.3 15l1.1-4.3L4 7.9l4.4-.3z" },
  { t: "Live conversations", d: "See who AVA is talking to right now, what they asked and how long the chat has been going.", i: "M3.5 4.5h13v9h-6l-4 3v-3h-3z" },
  { t: "Leads and quotes", d: "All inquiries in one list, warmest first. Move them from new to quote sent to won in one tap.", i: "M3 5h14M3 10h14M3 15h9" },
  { t: "Agenda", d: "Your appointments as a clear day-by-day list or a full month, just like your phone's calendar.", i: "M3.5 5.5h13v11h-13zM3.5 8.5h13M7 3.5v3M13 3.5v3" },
  { t: "Team chat and video", d: "Channels, private messages and one-click video calls for your team. On Pro (up to 5 users) and Premium (unlimited).", i: "M4 5.5h12v8H9l-3.5 3v-3H4z" },
  { t: "Your plan, your call", d: "Switch plans, update your card, download invoices or cancel yourself. No phone calls, no emails.", i: "M3 6h14v9H3zM3 9h14" },
  { t: "Analytics", d: "Conversations, leads and customers for today, this week, this month, or the last 60 or 90 days.", i: "M4 16V9M10 16V4M16 16v-5" },
];

export function Inside() {
  return (
    <section aria-labelledby="inside-title" className="v-inside">
      <h2 className="v-h2 v-center" data-reveal="" id="inside-title">
        Your own dashboard. Works like an app.
      </h2>
      <p className="v-lede v-center">Log in from your laptop or phone. Everything AVA does is right there.</p>
      <ul className="v-inside__grid">
        {items.map((x, i) => (
          <li data-reveal="" key={x.t} style={{ "--d": `${(i % 4) * 80}ms` } as CSSProperties}>
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <path d={x.i} />
            </svg>
            <h3>{x.t}</h3>
            <p>{x.d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { t: "Start your free trial", d: "Pick a plan and add your card. Every plan includes 7 days free; nothing is charged until the trial ends." },
    { t: "Install AVA or request your website", d: "Start: paste one line on your own website, with a guide for every platform. Pro and Premium: tell us what you want by chat or call and we build your site." },
    { t: "Leads turn into quotes", d: "AVA chats with your visitors, scores every lead and alerts you. You call the hottest first and send the quote." },
  ];
  return (
    <section aria-labelledby="how-title" className="v-how" id="how">
      <h2 className="v-h2 v-center" id="how-title">
        Up and running in three steps.
      </h2>
      <ol className="v-how__list">
        {steps.map((s, n) => (
          <li key={s.t}>
            <span aria-hidden="true">{n + 1}</span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
