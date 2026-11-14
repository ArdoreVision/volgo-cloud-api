/**
 * Call / WhatsApp / mail buttons for a customer.
 * These are click buttons: they open the phone, WhatsApp or the mail app on YOUR device.
 * The conversation then happens there and Volgo does not see it (unlike a linked WhatsApp number).
 */
export function contactDelen(c: string | null | undefined) {
  const t = c ?? "";
  const email = t.match(/[^\s,;/·]+@[^\s,;/·]+\.[a-z]{2,}/i)?.[0] ?? null;
  const ruw = t.replace(email ?? "", "").match(/\+?\d[\d\s().-]{6,}\d/)?.[0]?.trim() ?? null;
  let tel = ruw ? ruw.replace(/[\s().-]/g, "") : null;
  if (tel?.startsWith("00")) tel = `+${tel.slice(2)}`;
  // WhatsApp needs the international number without +: 0612345678 → 31612345678
  const wa = tel ? (tel.startsWith("+") ? tel.slice(1) : tel.startsWith("0") && tel.length === 10 ? `31${tel.slice(1)}` : tel) : null;
  return { email, tel, telToon: ruw, wa };
}

export function ContactKnoppen({ contact, naam, onderwerp, klein, kanaal }: { contact: string | null | undefined; naam?: string; onderwerp?: string; klein?: boolean; kanaal?: string }) {
  const c = contactDelen(contact);
  if (!c.tel && !c.email) return null;
  const vn = (naam ?? "").split(/\s+/)[0];
  const groet = `Hoi${vn && vn !== "Websitebezoeker" ? ` ${vn}` : ""}, `;
  const cls = klein ? "v-ck v-ck--klein" : "v-ck";
  return (
    <div className={cls} onClick={(e) => e.stopPropagation()} role="group" aria-label="Get in touch">
      {c.tel ? (
        <a className="v-ck__knop v-ck__knop--bel" href={`tel:${c.tel}`} title={`Call ${c.telToon ?? c.tel} with your own phone`}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
          </svg>
          {kanaal === "Telefoon" ? "Call back" : "Call"}
        </a>
      ) : null}
      {c.wa ? (
        <a
          className="v-ck__knop v-ck__knop--wa"
          href={`https://wa.me/${c.wa}?text=${encodeURIComponent(groet)}`}
          rel="noopener noreferrer"
          target="_blank"
          title="Opens WhatsApp on your own phone or computer. This conversation does not land in Volgo."
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
            <path d="M9 9.5c.3 1.8 2.6 4.3 4.6 4.8l1.2-1.2 1.7.8c-.2 1-1 1.6-2 1.6-3 0-6.4-3.3-6.4-6.3 0-1 .7-1.8 1.6-2l.8 1.7z" />
          </svg>
          WhatsApp
        </a>
      ) : null}
      {c.email ? (
        <a className="v-ck__knop" href={`mailto:${c.email}${onderwerp ? `?subject=${encodeURIComponent(`Je aanvraag: ${onderwerp}`)}` : ""}`} title={`Mail ${c.email}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
          </svg>
          Email
        </a>
      ) : null}
    </div>
  );
}

/** Where a request came from, as one clear label. */
export function KanaalLabel({ kanaal }: { kanaal: string | null | undefined }) {
  const k = (kanaal ?? "").toLowerCase();
  const [klasse, tekst] = k.includes("whatsapp")
    ? ["whatsapp", "WhatsApp"]
    : k.includes("telefoon") || k.includes("phone")
      ? ["telefoon", "Phone"]
      : k === "sms"
        ? ["sms", "Text"]
        : k.includes("formulier") || k.includes("form")
          ? ["formulier", "Contact form"]
          : k.includes("mail")
            ? ["mail", "Mail"]
            : k.includes("insta")
              ? ["insta", "Instagram"]
              : ["website", "Website-chat"];
  return <span className={`v-kanaal v-kanaal--${klasse}`}>{tekst}</span>;
}
