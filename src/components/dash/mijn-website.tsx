import { useEffect, useState } from "react";

import { controleerInstallatie, haalMijnWebsite } from "@/lib/api/groei.functions";

type Data = Awaited<ReturnType<typeof haalMijnWebsite>>;

/**
 * My website: your own website with the Volgo chat on it, on desktop and phone, and whether Volgo is live.
 * Nothing is built here. It is a look at the website you already have, the way your visitor sees it.
 */
export function MijnWebsite({ openTab, gebouwd = false }: { openTab: (t: string) => void; gebouwd?: boolean }) {
  const [d, setD] = useState<Data | null>(null);
  const [check, setCheck] = useState<"" | "bezig" | "ok" | "niet" | "geen" | "onbereikbaar">("");
  const [mobiel, setMobiel] = useState(false);
  const [versie, setVersie] = useState(0);

  const controleer = () => {
    setCheck("bezig");
    void controleerInstallatie()
      .then((r) => setCheck(r.status))
      .catch(() => setCheck("onbereikbaar"));
  };
  useEffect(() => {
    void haalMijnWebsite()
      .then((x) => {
        setD(x);
        if (x.siteUrl) controleer();
      })
      .catch(() => undefined);
  }, []);
  if (!d) return <p className="v-g__leeg">Loading…</p>;

  const staat = check === "ok";
  const status = check === "bezig" ? "Checking…" : staat ? "✓ Volgo is live" : d.siteUrl ? "Volgo is not on it yet" : "No website address yet";

  return (
    <div className="v-g">
      <header className="v-g__kop">
        <h1>My website</h1>
        <p>Your own website with Volgo in it, the way your visitor sees it. Click the chat button to try it.</p>
      </header>

      <section className="v-g__kaart">
        <div className="v-mw__kop">
          <div>
            <h2 style={{ margin: 0 }}>{d.siteUrl ? d.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : "Your website"}</h2>
            <span className={`v-g__status${staat ? " is-aan" : check === "bezig" ? "" : " is-let"}`}>{status}</span>
          </div>
          <div className="v-g__knoppen">
            {d.siteUrl ? (
              <>
                <button className="v-g__knop2" disabled={check === "bezig"} onClick={controleer} type="button">
                  Check again
                </button>
                <a className="v-g__knop2" href={d.siteUrl} rel="noreferrer" style={{ textDecoration: "none" }} target="_blank">
                  Open my website ↗
                </a>
              </>
            ) : null}
            {staat || gebouwd ? null : (
              <button className="v-g__knop" onClick={() => openTab("installeren")} type="button">
                {d.siteUrl ? "Install Volgo" : "Add my website"}
              </button>
            )}
          </div>
        </div>
        {!d.siteUrl ? (
          <p className="v-g__leeg" style={{ marginTop: 14 }}>
            {gebouwd ? "As soon as your website is live, you see it here with Volgo in it." : "Fill in your website address under Install. Then you see your website here, with your chat on it."}
          </p>
        ) : null}
        {check === "niet" && !gebouwd ? (
          <p className="v-g__leeg" style={{ marginTop: 14 }}>
            Below you see how your website will look with Volgo on it. To make it real for your visitors, finish the steps under Install.
          </p>
        ) : null}
        {check === "onbereikbaar" ? <p className="v-g__fout" style={{ marginTop: 14 }}>Your website could not be reached. Check the address under Install.</p> : null}
      </section>

      <section className="v-g__kaart">
        <div className="v-mw__kop" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Preview</h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>The same chat your visitors get. A test conversation you start here shows up in your inbox.</p>
          </div>
          <div className="v-g__tabs" style={{ margin: 0 }}>
            <button aria-pressed={!mobiel} onClick={() => setMobiel(false)} type="button">
              Desktop
            </button>
            <button aria-pressed={mobiel} onClick={() => setMobiel(true)} type="button">
              Phone
            </button>
            <button onClick={() => setVersie((v) => v + 1)} type="button">
              Reload
            </button>
            <button onClick={() => openTab("ava")} type="button">
              Change my chat
            </button>
          </div>
        </div>
        <div className={`v-g__scherm${mobiel ? " is-mobiel" : ""}`}>
          <div className="v-g__scherm-balk">
            <i />
            <i />
            <i />
            <span>{d.siteUrl || "your website"}</span>
          </div>
          <iframe key={`${versie}-${mobiel}`} loading="lazy" src={`/api/voorbeeld/${d.sleutel}`} title="Your website with Volgo" />
        </div>
        <p className="v-g__leeg" style={{ marginTop: 8 }}>
          Some parts of a website (like animations or a cookie banner) can look a little different in this preview. Your real website does not change.
        </p>
      </section>
    </div>
  );
}
