import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

import { haalWebsiteBeheer, importeerWebsite, maakWebsiteBeheer, nieuweWebsite, uploadSiteBestand, websiteActie } from "@/lib/api/beheer.functions";

type Data = Awaited<ReturnType<typeof haalWebsiteBeheer>>;
type Vol = Extract<Data, { liveUrl: string }>;

const BREEDTES = { telefoon: 390, tablet: 820, desktop: 0 } as const;
const tijd = (s: string) => new Date(s.replace(" ", "T") + "Z").toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const leesBase64 = (f: File) =>
  new Promise<string>((ok, fout) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fout(new Error("read"));
    r.readAsDataURL(f);
  });

/** The owner's website editor for one customer: preview, publish, versions, import, domain and uploads. Changes come from the Claude chat beside it. */
export function WebsiteBeheer({ id, ververs, bedrijf }: { id: number; ververs: number; bedrijf: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [melding, setMelding] = useState("");
  const [bezig, setBezig] = useState(false);
  const [scherm, setScherm] = useState<keyof typeof BREEDTES>("desktop");
  const [pagina, setPagina] = useState("");
  const [url, setUrl] = useState("");
  const [omschrijving, setOmschrijving] = useState("");
  const [domein, setDomein] = useState("");
  const [sleep, setSleep] = useState(false);
  const zip = useRef<HTMLInputElement>(null);
  const foto = useRef<HTMLInputElement>(null);

  async function laad() {
    setD(await haalWebsiteBeheer({ data: { id } }));
  }
  useEffect(() => {
    void laad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ververs]);

  async function doe(f: () => Promise<{ ok: boolean; message: string }>) {
    setBezig(true);
    setMelding("");
    try {
      const r = await f();
      setMelding(r.message);
      await laad();
    } catch {
      setMelding("That didn't work. Try again.");
    } finally {
      setBezig(false);
    }
  }
  async function upload(bestanden: FileList | null) {
    if (!bestanden?.length) return;
    for (const f of Array.from(bestanden)) await doe(async () => uploadSiteBestand({ data: { id, naam: f.name, data: await leesBase64(f) } }));
  }

  if (!d) return <p className="v-feed__empty">Loading website…</p>;

  if (!d.site)
    return (
      <div className="v-wb">
        <section className="v-kb__blok">
          <h3>No website in Volgo yet</h3>
          <p className="v-kb__leeg">Start from an existing website, a zip, or let Claude make a first version. Nothing goes live until you publish.</p>
          <div className="v-wb__start">
            <div>
              <b>Import an existing website</b>
              <div className="v-wb__rij">
                <input onChange={(e) => setUrl(e.target.value)} placeholder="https://their-current-site.nl" value={url} />
                <button className="v-kb__knop" disabled={bezig || !url.trim()} onClick={() => void doe(() => importeerWebsite({ data: { id, url } }))} type="button">
                  Import
                </button>
              </div>
            </div>
            <div>
              <b>Upload a zip</b>
              <button className="v-kb__knop2" disabled={bezig} onClick={() => zip.current?.click()} type="button">
                Choose zip
              </button>
              <input
                accept=".zip"
                hidden
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) void doe(async () => importeerWebsite({ data: { id, zip: await leesBase64(f) } }));
                }}
                ref={zip}
                type="file"
              />
            </div>
            <div>
              <b>New website by Claude</b>
              <textarea onChange={(e) => setOmschrijving(e.target.value)} placeholder={`${bedrijf}: hovenier in Middelburg. Services: tuinaanleg, bestrating, onderhoud. Style: calm, green, premium.`} rows={3} value={omschrijving} />
              <button className="v-kb__knop" disabled={bezig || omschrijving.trim().length < 10} onClick={() => void doe(() => nieuweWebsite({ data: { id, omschrijving } }))} type="button">
                {bezig ? "Building… (about a minute)" : "Make website"}
              </button>
            </div>
            <div>
              <b>Empty start</b>
              <button
                className="v-kb__knop2"
                disabled={bezig}
                onClick={() =>
                  void doe(async () => {
                    await maakWebsiteBeheer({ data: { id } });
                    return { ok: true, message: "Created. Ask Claude to build the pages." };
                  })
                }
                type="button"
              >
                Create empty site
              </button>
            </div>
          </div>
          {melding ? <p className="v-wb__melding">{melding}</p> : null}
        </section>
      </div>
    );

  const v = d as Vol;
  const site = v.site;
  const paginas = v.bestanden.filter((b) => /\.html?$/.test(b.pad)).map((b) => b.pad);
  const pad = pagina && paginas.includes(pagina) ? pagina : "index.html";
  const src = v.voorbeeld ? `${v.voorbeeld}${pad === "index.html" ? "" : pad.replace(/index\.html$/, "")}` : "";
  const nietGepubliceerd = site.concept_versie !== site.live_versie;
  const breedte = BREEDTES[scherm];

  return (
    <div className="v-wb">
      <section className="v-kb__blok v-wb__balk">
        <div className="v-wb__status">
          <span className={`v-wb__punt is-${site.status === "uit" ? "uit" : site.live_versie ? "live" : "concept"}`} />
          <span>
            <b>{site.status === "uit" ? "Off" : site.live_versie ? "Live" : "Not published yet"}</b>
            <small>
              {site.domein ? `${site.domein} (${site.domein_status === "actief" ? "active" : site.domein_status || "pending"})` : v.tijdelijkUrl.replace("https://", "")}
              {nietGepubliceerd && site.live_versie ? " · unpublished changes" : ""}
            </small>
          </span>
        </div>
        <div className="v-wb__knoppen">
          {site.live_versie ? (
            <a className="v-kb__knop2" href={v.liveUrl} rel="noopener noreferrer" target="_blank">
              Open live site ↗
            </a>
          ) : null}
          <button className="v-kb__knop" disabled={bezig || !nietGepubliceerd} onClick={() => void doe(() => websiteActie({ data: { id, actie: "publiceer" } }))} type="button">
            {nietGepubliceerd ? `Publish version ${v.conceptNummer}` : "Published"}
          </button>
        </div>
      </section>
      {melding ? <p className="v-wb__melding">{melding}</p> : null}

      <section className="v-kb__blok">
        <div className="v-wb__voorkop">
          <div className="v-kb__chips">
            {(Object.keys(BREEDTES) as (keyof typeof BREEDTES)[]).map((s) => (
              <button aria-pressed={scherm === s} key={s} onClick={() => setScherm(s)} type="button">
                {s === "telefoon" ? "Phone" : s === "tablet" ? "Tablet" : "Desktop"}
              </button>
            ))}
          </div>
          <select onChange={(e) => setPagina(e.target.value)} value={pad}>
            {paginas.map((p) => (
              <option key={p} value={p}>
                /{p.replace(/index\.html$/, "")}
              </option>
            ))}
          </select>
        </div>
        <div className="v-wb__kader">
          {src ? <iframe key={src} sandbox="allow-scripts allow-forms allow-popups" src={src} style={{ width: breedte ? `${breedte}px` : "100%" }} title="Website preview" /> : null}
        </div>
        <p className="v-kb__leeg">This is the concept (version {v.conceptNummer}). Ask Claude on the right to change anything, then publish.</p>
      </section>

      <section
        className={`v-kb__blok v-wb__drop${sleep ? " is-sleep" : ""}`}
        onDragLeave={() => setSleep(false)}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setSleep(true);
        }}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setSleep(false);
          void upload(e.dataTransfer.files);
        }}
      >
        <h3>Images and video</h3>
        <p className="v-kb__leeg">Drop files here or</p>
        <button className="v-kb__knop2" onClick={() => foto.current?.click()} type="button">
          Choose files
        </button>
        <input accept="image/*,video/mp4,video/webm" hidden multiple onChange={(e) => void upload(e.target.files)} ref={foto} type="file" />
        {v.bestanden.some((b) => b.pad.startsWith("images/")) ? (
          <p className="v-wb__bestanden">
            {v.bestanden
              .filter((b) => b.pad.startsWith("images/"))
              .map((b) => b.pad)
              .join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="v-kb__blok">
        <h3>Versions</h3>
        <ul className="v-kb__lijst">
          {v.versies.map((x) => (
            <li className="v-kb__rij v-kb__rij--plat v-wb__versie" key={x.id}>
              <b>
                #{x.nummer}
                {x.id === site.live_versie ? <em className="v-wb__label">live</em> : null}
                {x.id === site.concept_versie && x.id !== site.live_versie ? <em className="v-wb__label is-concept">concept</em> : null}
              </b>
              <span>{x.notitie || "Change"}</span>
              <small>
                {tijd(x.created_at)}
                {x.id !== site.live_versie ? (
                  <button className="v-kb__link" disabled={bezig} onClick={() => void doe(() => websiteActie({ data: { id, actie: "terug", versie: x.id } }))} type="button">
                    Put back live
                  </button>
                ) : null}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section className="v-kb__blok">
        <h3>Domain</h3>
        {site.domein ? (
          <>
            <p className="v-kb__leeg">
              Ask the customer to add a <b>CNAME</b> record for <b>{site.domein}</b> pointing to <b>sites.thevolgo.app</b> at their domain provider.
            </p>
            <button className="v-kb__knop2" disabled={bezig} onClick={() => void doe(() => websiteActie({ data: { id, actie: "domeincheck" } }))} type="button">
              Check again
            </button>
          </>
        ) : (
          <div className="v-wb__rij">
            <input onChange={(e) => setDomein(e.target.value)} placeholder="www.their-domain.nl" value={domein} />
            <button className="v-kb__knop2" disabled={bezig || !domein.trim()} onClick={() => void doe(() => websiteActie({ data: { id, actie: "domein", domein } }))} type="button">
              Link domain
            </button>
          </div>
        )}
      </section>

      <section className="v-kb__blok">
        <h3>Health</h3>
        {v.controle ? (
          <ul className="v-kb__problemen">
            {v.controle.punten.map((p) => (
              <li className={`is-${p.ernst}`} key={p.tekst}>
                {p.tekst}
              </li>
            ))}
          </ul>
        ) : (
          <p className="v-kb__leeg">Not checked yet. Published sites are checked every morning.</p>
        )}
        <div className="v-wb__knoppen" style={{ marginTop: 10 }}>
          <button className="v-kb__knop2" disabled={bezig} onClick={() => void doe(() => websiteActie({ data: { id, actie: "controleer" } }))} type="button">
            Check now
          </button>
          <button className="v-kb__knop2" disabled={bezig} onClick={() => void doe(() => websiteActie({ data: { id, actie: "aanuit", aan: site.status === "uit" } }))} type="button">
            {site.status === "uit" ? "Turn website on" : "Turn website off"}
          </button>
          <button
            className="v-kb__knop2"
            disabled={bezig}
            onClick={() => {
              const u = window.prompt("Import again from which address? This becomes a new concept version.", "https://");
              if (u && u.length > 8) void doe(() => importeerWebsite({ data: { id, url: u } }));
            }}
            type="button"
          >
            Import again
          </button>
        </div>
      </section>
    </div>
  );
}
