import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { bouwSite, haalBouwer, herstelSite, publiceerSite } from "@/lib/api/website.functions";

import { Upsell } from "./upsell";

type Data = Awaited<ReturnType<typeof haalBouwer>>;
type Bericht = { rol: "ik" | "volgo"; tekst: string };

const IDEEEN = ["Build a website for my business", "Make it dark and sleek", "Add a section with frequently asked questions", "Make the button at the top stand out more"];

/** Website builder: tell Volgo in the chat what you want, see the result next to it, put it online with one button. */
export function Website() {
  const [d, setD] = useState<Data | null>(null);
  const [chat, setChat] = useState<Bericht[]>([]);
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [versie, setVersie] = useState(0);
  const [mobiel, setMobiel] = useState(false);
  const [toon, setToon] = useState<"chat" | "voorbeeld">("chat");
  const [gekopieerd, setGekopieerd] = useState(false);
  const eind = useRef<HTMLDivElement | null>(null);

  const laad = () =>
    haalBouwer().then((x) => {
      setD(x);
      setChat(x.chat);
    });
  useEffect(() => {
    void laad().catch(() => setFout("Loading did not work. Refresh the page."));
  }, []);
  useEffect(() => {
    eind.current?.scrollIntoView({ block: "end" });
  }, [chat, bezig]);

  if (!d) return <p className="v-muted">{fout || "Loading…"}</p>;

  if (!d.mag)
    return (
      <>
        <header className="v-dash__head">
          <h1>Build website</h1>
          <p>Build your website by chatting. This is part of Complete.</p>
        </header>
        <Upsell
          knop="See Complete"
          punten={["Tell the chat what you want", "A preview right next to it", "Online with one button", "The Volgo chat is already on it"]}
          tag="Complete"
          tekst="You build your website by simply typing what you want. Volgo makes it, you watch along and adjust."
          titel="Build your website in a chat"
        />
      </>
    );

  async function stuur(vraag: string) {
    const v = vraag.trim();
    if (v.length < 2 || bezig) return;
    setFout("");
    setTekst("");
    setChat((c) => [...c, { rol: "ik", tekst: v }]);
    setBezig(true);
    const r = await bouwSite({ data: { tekst: v } }).catch(() => ({ ok: false as const, message: "Something went wrong. Please try again." }));
    setBezig(false);
    if (!r.ok) {
      setFout(r.message);
      setChat((c) => c.slice(0, -1));
      setTekst(v);
      return;
    }
    await laad();
    if (r.gewijzigd) {
      setVersie((n) => n + 1);
      setToon("voorbeeld");
    }
  }
  const verstuur = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void stuur(tekst);
  };
  async function zetOnline(aan: boolean) {
    await publiceerSite({ data: { aan } });
    await laad();
  }
  async function ongedaan() {
    const r = await herstelSite();
    if (r.ok) {
      await laad();
      setVersie((n) => n + 1);
    }
  }

  const origin = typeof window === "undefined" ? "https://thevolgo.app" : window.location.origin;
  const adres = d.slug ? `${origin}/s/${d.slug}` : "";

  return (
    <div className="v-bw">
      <header className="v-bw__kop">
        <div>
          <h1>Build website</h1>
          <p>Type what you want. Volgo builds it, you watch along.</p>
        </div>
        {d.heeftSite ? (
          <div className="v-bw__acties">
            <span className={`v-bw__status${d.gepubliceerd ? " is-online" : ""}`}>{d.gepubliceerd ? "Online" : "Concept"}</span>
            {d.heeftVorige ? (
              <button className="v-bw__stil" disabled={bezig} onClick={() => void ongedaan()} type="button">
                Undo
              </button>
            ) : null}
            {d.eigenaar ? (
              d.gepubliceerd ? (
                <button className="v-bw__stil" onClick={() => void zetOnline(false)} type="button">
                  Take offline
                </button>
              ) : (
                <button className="v-bw__online" onClick={() => void zetOnline(true)} type="button">
                  Publish
                </button>
              )
            ) : null}
          </div>
        ) : null}
      </header>

      {d.gepubliceerd && adres ? (
        <p className="v-bw__adres">
          <span>Your website is online at</span>
          <a href={adres} rel="noopener noreferrer" target="_blank">
            {adres.replace(/^https?:\/\//, "")}
          </a>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(adres).then(() => {
                setGekopieerd(true);
                window.setTimeout(() => setGekopieerd(false), 1800);
              });
            }}
            type="button"
          >
            {gekopieerd ? "Copied" : "Copy link"}
          </button>
        </p>
      ) : null}

      <div className="v-bw__wissel" role="tablist">
        <button aria-selected={toon === "chat"} onClick={() => setToon("chat")} role="tab" type="button">
          Chat
        </button>
        <button aria-selected={toon === "voorbeeld"} onClick={() => setToon("voorbeeld")} role="tab" type="button">
          Preview
        </button>
      </div>

      <div className="v-bw__vlak" data-toon={toon}>
        <section aria-label="Chat with Volgo" className="v-bw__chat">
          <div className="v-bw__berichten">
            {chat.length === 0 ? (
              <div className="v-bw__start">
                <strong>What kind of website do you want?</strong>
                <p>Tell it in your own words. For example what you do, for whom, and which style you like. Volgo already knows your business from your settings.</p>
              </div>
            ) : null}
            {chat.map((b, i) => (
              <p className={`v-bw__b v-bw__b--${b.rol}`} key={i}>
                {b.tekst}
              </p>
            ))}
            {bezig ? (
              <p className="v-bw__b v-bw__b--volgo v-bw__b--bezig">
                <i />
                <i />
                <i />
                <span>Volgo is building. This takes about a minute.</span>
              </p>
            ) : null}
            <div ref={eind} />
          </div>
          {!bezig ? (
            <div className="v-bw__ideeen">
              {(d.heeftSite ? IDEEEN.slice(1) : IDEEEN.slice(0, 1)).map((x) => (
                <button key={x} onClick={() => void stuur(x)} type="button">
                  {x}
                </button>
              ))}
            </div>
          ) : null}
          {fout ? <p className="v-err v-bw__fout">{fout}</p> : null}
          <form className="v-bw__invoer" onSubmit={verstuur}>
            <textarea
              aria-label="Your message"
              disabled={bezig}
              maxLength={3000}
              onChange={(e) => setTekst(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void stuur(tekst);
                }
              }}
              placeholder={d.heeftSite ? "What do you want to change?" : "Describe your website…"}
              rows={1}
              value={tekst}
            />
            <button aria-label="Send" disabled={bezig || tekst.trim().length < 2} type="submit">
              ↑
            </button>
          </form>
        </section>

        <section aria-label="Preview of your website" className="v-bw__voorbeeld">
          <div className="v-bw__balk">
            <div className="v-seg" role="radiogroup" aria-label="Screen size">
              <button aria-checked={!mobiel} aria-selected={!mobiel} onClick={() => setMobiel(false)} role="radio" type="button">
                Computer
              </button>
              <button aria-checked={mobiel} aria-selected={mobiel} onClick={() => setMobiel(true)} role="radio" type="button">
                Telefoon
              </button>
            </div>
            {d.heeftSite ? (
              <a href="/api/site-concept" rel="noopener noreferrer" target="_blank">
                Open large
              </a>
            ) : null}
          </div>
          <div className={`v-bw__scherm${mobiel ? " is-mobiel" : ""}`}>
            <iframe key={versie} src="/api/site-concept" title="Preview of your website" />
          </div>
        </section>
      </div>
    </div>
  );
}
