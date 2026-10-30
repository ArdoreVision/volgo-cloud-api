import { useEffect, useRef, useState } from "react";

import { TryAvaButton } from "./ava-chat";

type Msg = { from: "klant" | "ava" | "systeem"; text: string; time: string };

const script: Msg[] = [
  { from: "systeem", text: "Nieuwe aanvraag via je website: warmtepomp, vrijstaande woning", time: "09:41" },
  { from: "ava", text: "Hoi Sanne, bedankt voor je aanvraag! Mag ik je twee korte vragen stellen, zodat we je meteen goed kunnen helpen?", time: "09:42" },
  { from: "klant", text: "Ja hoor, zeg het maar.", time: "09:44" },
  { from: "ava", text: "Top. Wanneer komt een adviseur je het best uit: dinsdagmiddag of donderdagochtend?", time: "09:44" },
  { from: "klant", text: "Donderdag graag.", time: "09:47" },
  { from: "systeem", text: "Afspraak ingepland: donderdag 10:00. Eigenaar ontving een melding.", time: "09:47" },
];

export function Demo() {
  // Alle berichten staan altijd in de pagina (ook zonder JavaScript).
  // Na het laden spelen ze één keer na als een gesprek.
  const [step, setStep] = useState(script.length);
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setStep(1);
    let i = 1;
    const id = window.setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= script.length) window.clearInterval(id);
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section aria-labelledby="demo-titel" className="v-demo" id="hoe">
      <div className="v-demo__copy">
        <h2 className="v-h2" id="demo-titel">
          Zo klinkt AVA.
        </h2>
        <p className="v-lede">
          Een klant vult je formulier in. Binnen een minuut krijgt hij een persoonlijk bericht, AVA stelt de juiste
          vragen en plant de afspraak in je agenda. Jij krijgt alleen nog de melding.
        </p>
        <ol className="v-steps">
          <li>
            <strong>Reageert direct</strong>
            <span>Dag en nacht, ook in het weekend.</span>
          </li>
          <li>
            <strong>Vraagt door</strong>
            <span>Wat, waar en wanneer, in jouw toon.</span>
          </li>
          <li>
            <strong>Volgt op</strong>
            <span>Na stilte stuurt AVA vriendelijk een herinnering.</span>
          </li>
        </ol>
        <TryAvaButton />
      </div>
      <div aria-label="Voorbeeldgesprek tussen AVA en een klant" className="v-phone" role="img">
        <div className="v-phone__screen">
          <div className="v-phone__bar">
            <span className="v-phone__avatar" aria-hidden="true" />
            <div>
              <strong>AVA</strong>
              <small>Assistent van Installatiebedrijf Noord</small>
            </div>
          </div>
          <ul className="v-chat">
            {script.map((m, i) => (
              <li className={`v-msg v-msg--${m.from}`} data-on={i < step ? "1" : "0"} key={i}>
                <p>{m.text}</p>
                <time>{m.time}</time>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
