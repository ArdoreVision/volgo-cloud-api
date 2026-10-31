import { useEffect, useRef, useState } from "react";

import { TryAvaButton } from "./ava-chat";

type Msg = { from: "klant" | "ava" | "systeem"; text: string; time: string };

const script: Msg[] = [
  { from: "klant", text: "Hi, my boiler just broke down. Can you come by this week?", time: "21:14" },
  { from: "ava", text: "Oh no, that's annoying! I'll make sure the team calls you first thing tomorrow. What's your name and phone number?", time: "21:14" },
  { from: "klant", text: "Sanne de Vries, 06 12 34 56 78", time: "21:15" },
  { from: "ava", text: "Thanks, Sanne. Is it okay if Northside Heating contacts you about this?", time: "21:15" },
  { from: "klant", text: "Yes please!", time: "21:16" },
  { from: "systeem", text: "Hot lead · warmth 92 · owner notified by email", time: "21:16" },
];

export function Demo() {
  // All messages are in the page (also without JavaScript); after load they play once like a conversation.
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
          Meet AVA.
        </h2>
        <p className="v-lede">
          A visitor opens the chat on your website at nine in the evening. AVA answers right away, asks the right questions and
          gets their details. You see the lead in your dashboard, hottest first.
        </p>
        <ol className="v-steps">
          <li>
            <strong>Answers instantly</strong>
            <span>24/7, in your visitor&apos;s own language.</span>
          </li>
          <li>
            <strong>Asks the right questions</strong>
            <span>What they need, their name and how to reach them, with permission.</span>
          </li>
          <li>
            <strong>Hands you the hot ones</strong>
            <span>Every lead gets a warmth score. Hot leads land in your inbox straight away.</span>
          </li>
        </ol>
        <TryAvaButton />
      </div>
      <div aria-label="Example conversation between AVA and a website visitor" className="v-phone" role="img">
        <div className="v-phone__screen">
          <div className="v-phone__bar">
            <span className="v-phone__avatar" aria-hidden="true" />
            <div>
              <strong>AVA</strong>
              <small>Assistant at Northside Heating</small>
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
