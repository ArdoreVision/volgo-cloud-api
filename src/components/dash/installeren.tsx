import { useEffect, useState } from "react";

import { bewaarMijnWebsite, controleerInstallatie, haalMijnWebsite } from "@/lib/api/groei.functions";
import { INSTALL_MINUTEN, INSTALL_SECONDEN, PLATFORMS, installRegel, shopifyCodeLink, wordpressUploadLink } from "@/lib/installatie";

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
  // What Volgo saw the website is made with, and whether the owner has started installing (then Volgo keeps looking by itself).
  const [herkend, setHerkend] = useState("");
  const [wacht, setWacht] = useState(false);

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
  // Once the owner has started (copied the line, downloaded the plugin or opened their website's admin), look every
  // few seconds for five minutes. The moment Volgo is on the website this page says so: no button to press.
  useEffect(() => {
    if (!wacht || check === "ok") return;
    let keer = 0;
    const t = window.setInterval(() => {
      keer += 1;
      if (keer > 50) {
        window.clearInterval(t);
        setWacht(false);
        return;
      }
      if (document.hidden) return;
      void controleerInstallatie()
        .then((r) => {
          if (r.status !== "ok") return;
          setCheck("ok");
          setWacht(false);
          klaar?.();
        })
        .catch(() => undefined);
    }, 6000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wacht, check]);
  if (!d) return <p className="v-g__leeg">Loading…</p>;

  const origin = typeof window === "undefined" ? "https://thevolgo.app" : window.location.origin;
  const code = installRegel(origin, d.sleutel);
  const p = PLATFORMS.find((x) => x.id === platform);
  const shopifyLink = shopifyCodeLink(d.siteUrl);
  const wpLink = wordpressUploadLink(d.siteUrl);
  const begonnen = () => {
    setGeplakt(true);
    setWacht(true);
  };
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
    const r = await bewaarMijnWebsite({ data: { site_url: s } }).catch(() => null);
    setOpgeslagen(r ? "ok" : "fout");
    if (r) {
      setSite(s);
      setD({ ...d!, siteUrl: s });
      // Volgo looked at the website: fill in what it is made with, so the owner does not have to know.
      if (r.platform && PLATFORMS.some((x) => x.id === r.platform)) {
        setHerkend(r.platform);
        kiesPlatform(r.platform);
      }
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
        <p>
          Put Volgo on the website you already have. Fill in your address, Volgo sees what your website is made with and shows the one thing to do. That part takes about {INSTALL_SECONDEN} seconds; no coding knowledge needed.
        </p>
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
              <small>
                {herkend && herkend === platform
                  ? `We looked at your website: it is made with ${p?.naam}. Not right? Choose another.`
                  : "Not sure? Choose “Other / HTML”, or ask whoever made your website."}
              </small>
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
              <strong>{p?.id === "wordpress" ? "Upload your Volgo plugin" : "Copy your line and paste it into your website"}</strong>
              <small>{p?.id === "wordpress" ? "Your code is already in the plugin. Nothing to copy or paste." : "One line, one time. After that Volgo is on every page."}</small>
              {stap2 && p?.id === "wordpress" ? (
                <>
                  <div className="v-g__knoppen" style={{ margin: "10px 0 16px" }}>
                    <a className="v-g__knop" download="volgo.zip" href="/api/wordpress-plugin" onClick={begonnen} style={{ textDecoration: "none" }}>
                      1. Download my Volgo plugin
                    </a>
                    {wpLink ? (
                      <a className="v-g__knop2" href={wpLink} onClick={begonnen} rel="noopener noreferrer" style={{ textDecoration: "none" }} target="_blank">
                        2. Open the upload page in WordPress
                      </a>
                    ) : null}
                  </div>
                  <ol className="v-g__stappen">
                    <li>Click “Download my Volgo plugin”. You get the file volgo.zip.</li>
                    <li>Click “Open the upload page in WordPress” and log in if it asks. (Or go to Plugins → Add New → Upload Plugin.)</li>
                    <li>Choose volgo.zip, click Install Now, then Activate.</li>
                  </ol>
                  {p.noot ? (
                    <p className="v-g__leeg" style={{ marginTop: 8 }}>
                      {p.noot}
                    </p>
                  ) : null}
                  <details style={{ marginTop: 10 }}>
                    <summary>Rather paste one line yourself?</summary>
                    <pre className="v-g__code">{code}</pre>
                    <div className="v-g__knoppen" style={{ margin: "10px 0 0" }}>
                      <button
                        className="v-g__knop2"
                        onClick={() => {
                          kopieer(code, "code");
                          begonnen();
                        }}
                        type="button"
                      >
                        {gekopieerd === "code" ? "Copied ✓" : "Copy my line"}
                      </button>
                    </div>
                    <p className="v-g__leeg" style={{ marginTop: 8 }}>
                      Paste it just above &lt;/body&gt;, for example with the free plugin “WPCode” (Code Snippets → Header &amp; Footer → Footer).
                    </p>
                  </details>
                </>
              ) : null}
              {stap2 && p && p.id !== "wordpress" ? (
                <>
                  <pre className="v-g__code">{code}</pre>
                  <div className="v-g__knoppen" style={{ margin: "10px 0 16px" }}>
                    <button
                      className="v-g__knop"
                      onClick={() => {
                        kopieer(code, "code");
                        setWacht(true);
                      }}
                      type="button"
                    >
                      {gekopieerd === "code" ? "Copied ✓" : "Copy my line"}
                    </button>
                  </div>
                  {p.id === "shopify" && shopifyLink ? (
                    <div className="v-g__knoppen" style={{ margin: "0 0 16px" }}>
                      <a className="v-g__knop" href={shopifyLink} onClick={() => setWacht(true)} rel="noopener noreferrer" style={{ textDecoration: "none" }} target="_blank">
                        Open my theme code in Shopify
                      </a>
                      <small>Opens theme.liquid of your live theme in a new tab. Log in to Shopify if it asks.</small>
                    </div>
                  ) : null}
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
                      <button className="v-g__knop2" onClick={begonnen} type="button">
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
              <small>{wacht && !staat ? "Volgo is watching your website. This turns green by itself as soon as the chat is on it." : "Volgo looks at your website and tells you if the chat is on it."}</small>
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
