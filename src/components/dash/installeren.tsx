import { useEffect, useState } from "react";

import { bewaarMijnWebsite, controleerInstallatie, haalMijnWebsite } from "@/lib/api/groei.functions";
import { INSTALL_MINUTEN, PLATFORMS, installRegel } from "@/lib/installatie";

import { InstelLijst } from "./instel-lijst";

type Data = Awaited<ReturnType<typeof haalMijnWebsite>>;
type Wie = "zelf" | "bouwer" | "volgo";
type Check = "" | "bezig" | "ok" | "niet" | "geen" | "onbereikbaar";

const PLATFORM_KEUZE = "volgo-platform";

/**
 * Install: put Volgo in your own website, one step at a time. Written for someone who has never seen code:
 * every step says what to click, the line has a copy button, and the last step checks by itself that it works.
 * Three ways: do it yourself, send it to whoever manages your website, or let Volgo do it.
 */
export function Installeren({ openTab, wijDoenHet, klaar }: { openTab: (t: string) => void; wijDoenHet: boolean; klaar?: () => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [wie, setWie] = useState<Wie>("zelf");
  const [site, setSite] = useState("");
  const [opgeslagen, setOpgeslagen] = useState<"" | "ok" | "fout">("");
  const [platform, setPlatform] = useState("");
  const [gekopieerd, setGekopieerd] = useState("");
  const [geplakt, setGeplakt] = useState(false);
  const [check, setCheck] = useState<Check>("");

  useEffect(() => {
    try {
      const p = localStorage.getItem(PLATFORM_KEUZE);
      if (p && PLATFORMS.some((x) => x.id === p)) setPlatform(p);
    } catch {
      /* private mode */
    }
    void haalMijnWebsite()
      .then((x) => {
        setD(x);
        setSite(x.siteUrl);
        // A saved address: check straight away, so the status on top is real.
        if (x.siteUrl)
          void controleerInstallatie()
            .then((r) => {
              if (r.status === "ok") {
                setCheck("ok");
                klaar?.();
              }
            })
            .catch(() => undefined);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!d) return <p className="v-g__leeg">Loading…</p>;

  const origin = typeof window === "undefined" ? "https://thevolgo.app" : window.location.origin;
  const code = installRegel(origin, d.sleutel);
  const p = PLATFORMS.find((x) => x.id === platform);
  const staat = check === "ok";
  const kopieer = (t: string, wat: string) => void navigator.clipboard.writeText(t).then(() => setGekopieerd(wat));
  const kiesPlatform = (id: string) => {
    setPlatform(id);
    try {
      localStorage.setItem(PLATFORM_KEUZE, id);
    } catch {
      /* private mode */
    }
  };

  async function bewaar() {
    let s = site.trim();
    if (s && !/^https?:\/\//.test(s)) s = `https://${s}`;
    if (!/^https?:\/\/[^\s]+\.[^\s]+$/.test(s)) return setOpgeslagen("fout");
    const ok = await bewaarMijnWebsite({ data: { site_url: s } })
      .then(() => true)
      .catch(() => false);
    setOpgeslagen(ok ? "ok" : "fout");
    if (ok) {
      setSite(s);
      setD({ ...d!, siteUrl: s });
    }
  }
  async function controleer() {
    setCheck("bezig");
    const r = await controleerInstallatie().catch(() => ({ status: "onbereikbaar" as const }));
    setCheck(r.status);
    if (r.status === "ok") klaar?.();
  }

  // What is done, in order. A step opens when the one before it is done.
  const stap1 = Boolean(d.siteUrl);
  const stap2 = stap1 && Boolean(p);
  const stap3 = stap2 && (geplakt || staat);
  const gedaan = staat ? 4 : [stap1, stap2, stap3].filter(Boolean).length;
  const nu = staat ? 0 : !stap1 ? 1 : !stap2 ? 2 : !stap3 ? 3 : 4;

  // For a business that has someone else manage its website: a ready-made message with the line and where it goes.
  const bericht = `Hi,\n\nCould you put this one line in my website${d.siteUrl ? ` (${d.siteUrl})` : ""}? It goes just above </body>, on every page. It takes a few minutes.\n\n${code}\n\nThis is Volgo: the chat that lets visitors book an appointment themselves.\n\nThank you!`;
  const naarBouwer = `mailto:?subject=${encodeURIComponent("Could you put this line in my website?")}&body=${encodeURIComponent(bericht)}`;
  const naarVolgo = `mailto:volgo.app@outlook.com?subject=${encodeURIComponent("Please put Volgo on my website")}&body=${encodeURIComponent(`Hi Volgo,\n\nCould you put Volgo in my website?\n\nWebsite: ${d.siteUrl || ""}\nMade with: ${p?.naam ?? ""}\nMy line: ${code}\n`)}`;

  const Nr = ({ n, af }: { n: number; af: boolean }) => (
    <span aria-hidden="true" className={`v-inst__nr${af ? " is-klaar" : ""}`}>
      {af ? "✓" : n}
    </span>
  );
  const Adres = (
    <div className="v-inst__rij">
      <label className="v-g__veld" style={{ flex: "1 1 220px" }}>
        <span className="v-sr">Website address</span>
        <input inputMode="url" onChange={(e) => setSite(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void bewaar()} placeholder="www.yourbusiness.com" value={site} />
      </label>
      <button className="v-g__knop" onClick={() => void bewaar()} type="button">
        Save
      </button>
    </div>
  );

  return (
    <div className="v-g v-wiz">
      <header className="v-g__kop">
        <h1>Install</h1>
        <p>Put Volgo on the website you already have. About {INSTALL_MINUTEN} minutes, no coding knowledge needed. Follow the steps one by one.</p>
      </header>

      {staat ? (
        <section className="v-g__kaart v-wiz__klaar">
          <span aria-hidden="true" className="v-wiz__vink">
            ✓
          </span>
          <div>
            <h2>Volgo is live on your website</h2>
            <p>Visitors can now chat and book an appointment. Everything lands in your inbox.</p>
          </div>
          <div className="v-g__knoppen">
            <button className="v-g__knop" onClick={() => openTab("mijnsite")} type="button">
              See my website
            </button>
            <button className="v-g__knop2" onClick={() => openTab("gesprekken")} type="button">
              Open inbox
            </button>
          </div>
        </section>
      ) : (
        <div className="v-wiz__voortgang" role="status">
          <strong>
            Step {Math.min(gedaan + 1, 4)} of 4
          </strong>
          <div aria-hidden="true" className="v-wiz__balk">
            <i style={{ width: `${(gedaan / 4) * 100}%` }} />
          </div>
        </div>
      )}

      <div aria-label="Who installs it" className="v-wiz__wie" role="tablist">
        <button aria-selected={wie === "zelf"} onClick={() => setWie("zelf")} role="tab" type="button">
          <strong>I do it myself</strong>
          <small>Step by step, about {INSTALL_MINUTEN} minutes</small>
        </button>
        <button aria-selected={wie === "bouwer"} onClick={() => setWie("bouwer")} role="tab" type="button">
          <strong>Someone else manages my website</strong>
          <small>Send them the line with one click</small>
        </button>
        <button aria-selected={wie === "volgo"} onClick={() => setWie("volgo")} role="tab" type="button">
          <strong>Let Volgo do it</strong>
          <small>{wijDoenHet ? "Included in your plan" : "We help you by email"}</small>
        </button>
      </div>

      {wie === "zelf" ? (
        <section className="v-g__kaart">
          <div className={`v-inst${nu === 1 ? " is-nu" : ""}`}>
            <Nr af={stap1} n={1} />
            <div className="v-inst__body">
              <strong>Fill in your website address</strong>
              <small>So Volgo knows which website your chat goes on.</small>
              {Adres}
              {opgeslagen === "ok" ? <span className="v-g__ok">Saved.</span> : null}
              {opgeslagen === "fout" ? <span className="v-g__fout">That does not look like a website address. Example: www.yourbusiness.com</span> : null}
            </div>
          </div>

          <div className={`v-inst${nu === 2 ? " is-nu" : ""}${stap1 ? "" : " is-dicht"}`}>
            <Nr af={stap2} n={2} />
            <div className="v-inst__body">
              <strong>What is your website made with?</strong>
              <small>Not sure? Choose “Other / HTML”, or ask whoever made your website.</small>
              <div className="v-g__tabs">
                {PLATFORMS.map((x) => (
                  <button aria-pressed={platform === x.id} disabled={!stap1} key={x.id} onClick={() => kiesPlatform(x.id)} type="button">
                    {x.naam}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`v-inst${nu === 3 ? " is-nu" : ""}${stap2 ? "" : " is-dicht"}`}>
            <Nr af={stap3} n={3} />
            <div className="v-inst__body">
              <strong>Copy your line and paste it into your website</strong>
              <small>One line, one time. After that Volgo is on every page.</small>
              {stap2 && p ? (
                <>
                  <pre className="v-g__code">{code}</pre>
                  <div className="v-g__knoppen" style={{ margin: "10px 0 16px" }}>
                    <button className="v-g__knop" onClick={() => kopieer(code, "code")} type="button">
                      {gekopieerd === "code" ? "Copied ✓" : "Copy my line"}
                    </button>
                  </div>
                  <p className="v-inst__vraag">Now paste it in {p.naam}:</p>
                  <ol className="v-g__stappen">
                    {p.stappen.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ol>
                  {p.noot ? (
                    <p className="v-g__leeg" style={{ marginTop: 8 }}>
                      {p.noot}
                    </p>
                  ) : null}
                  {staat ? null : (
                    <div className="v-g__knoppen" style={{ marginTop: 14 }}>
                      <button className="v-g__knop2" onClick={() => setGeplakt(true)} type="button">
                        {geplakt ? "Pasted ✓" : "I pasted and saved it"}
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <div className={`v-inst${nu === 4 ? " is-nu" : ""}${stap3 ? "" : " is-dicht"}`}>
            <Nr af={staat} n={4} />
            <div className="v-inst__body">
              <strong>Check that it works</strong>
              <small>Volgo looks at your website and tells you if the chat is on it.</small>
              <div className="v-g__knoppen" style={{ marginTop: 10 }}>
                <button className="v-g__knop" disabled={check === "bezig" || !stap1} onClick={() => void controleer()} type="button">
                  {check === "bezig" ? "Checking…" : staat ? "Check again" : "Check now"}
                </button>
                {check === "ok" ? <span className="v-g__ok">✓ Volgo is on your website. Appointments now come in by themselves.</span> : null}
                {check === "niet" ? <span className="v-g__fout">Not found yet. Did you save the line and publish your website? It can take a few minutes.</span> : null}
                {check === "geen" ? <span className="v-g__fout">Fill in your website address first (step 1) and press Save.</span> : null}
                {check === "onbereikbaar" ? <span className="v-g__fout">Your website could not be reached. Check the address in step 1.</span> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {wie === "bouwer" ? (
        <section className="v-g__kaart">
          <h2>Send it to whoever manages your website</h2>
          <p>They get your line and where it goes. It takes them a few minutes. Afterwards you press Check here.</p>
          <div className="v-inst">
            <Nr af={stap1} n={1} />
            <div className="v-inst__body">
              <strong>Fill in your website address</strong>
              {Adres}
              {opgeslagen === "ok" ? <span className="v-g__ok">Saved.</span> : null}
              {opgeslagen === "fout" ? <span className="v-g__fout">That does not look like a website address. Example: www.yourbusiness.com</span> : null}
            </div>
          </div>
          <div className="v-inst">
            <Nr af={false} n={2} />
            <div className="v-inst__body">
              <strong>Send the message</strong>
              <small>Opens your own mail with the message ready. Or copy it and send it by WhatsApp.</small>
              <pre className="v-g__code v-wiz__bericht">{bericht}</pre>
              <div className="v-g__knoppen" style={{ marginTop: 10 }}>
                <a className="v-g__knop" href={naarBouwer} style={{ textDecoration: "none" }}>
                  Open in my mail
                </a>
                <button className="v-g__knop2" onClick={() => kopieer(bericht, "bericht")} type="button">
                  {gekopieerd === "bericht" ? "Copied ✓" : "Copy the message"}
                </button>
              </div>
            </div>
          </div>
          <div className="v-inst">
            <Nr af={staat} n={3} />
            <div className="v-inst__body">
              <strong>Check that it works</strong>
              <small>When they tell you it is done, press this button.</small>
              <div className="v-g__knoppen" style={{ marginTop: 10 }}>
                <button className="v-g__knop" disabled={check === "bezig" || !stap1} onClick={() => void controleer()} type="button">
                  {check === "bezig" ? "Checking…" : "Check now"}
                </button>
                {check === "ok" ? <span className="v-g__ok">✓ Volgo is on your website.</span> : null}
                {check === "niet" ? <span className="v-g__fout">Not found yet. Ask if the line is saved and the website is published.</span> : null}
                {check === "geen" ? <span className="v-g__fout">Fill in your website address first and press Save.</span> : null}
                {check === "onbereikbaar" ? <span className="v-g__fout">Your website could not be reached. Check the address.</span> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {wie === "volgo" ? (
        <section className="v-g__kaart">
          <h2>{wijDoenHet ? "We put Volgo on your website for you" : "We help you get Volgo on your website"}</h2>
          <p>
            {wijDoenHet
              ? "Installing is included in your plan. Send us your website address and how we can get in, and we do the rest. You get a message as soon as Volgo is on."
              : "Stuck? Send us your line and your website address and we help you by email. Having us install it for you is included in Growth and Pro."}
          </p>
          <div className="v-inst">
            <Nr af={stap1} n={1} />
            <div className="v-inst__body">
              <strong>Fill in your website address</strong>
              {Adres}
              {opgeslagen === "ok" ? <span className="v-g__ok">Saved.</span> : null}
              {opgeslagen === "fout" ? <span className="v-g__fout">That does not look like a website address. Example: www.yourbusiness.com</span> : null}
            </div>
          </div>
          <div className="v-inst">
            <Nr af={false} n={2} />
            <div className="v-inst__body">
              <strong>Email us</strong>
              <small>Opens your own mail with your website and your line already filled in. Never send a password by email: we ask how to get in safely.</small>
              <div className="v-g__knoppen" style={{ marginTop: 10 }}>
                <a className="v-g__knop" href={naarVolgo} style={{ textDecoration: "none" }}>
                  Email Volgo
                </a>
                {wijDoenHet ? null : (
                  <a className="v-g__knop2" href="/pricing" style={{ textDecoration: "none" }}>
                    See Growth and Pro
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <InstelLijst openTab={openTab} />
    </div>
  );
}
