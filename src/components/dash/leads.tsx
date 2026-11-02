import { useState } from "react";

import { STATUS_LABEL, type DashData, type Lead, type Status, datumAms, sqlDate, warmteLabel } from "./util";

type Filter = "alle" | "nieuw" | "heet" | "open" | "klaar";
const FILTERS: [Filter, string][] = [
  ["alle", "All"],
  ["nieuw", "New"],
  ["heet", "Hot"],
  ["open", "In progress"],
  ["klaar", "Won / lost"],
];

export const leadOpen = (l: { status: string }) => l.status !== "klant" && l.status !== "verloren";

/** Leads page: hottest first, with filters, search and a status per lead. */
export function Leads({
  data,
  leads,
  openLead,
  zetStatus,
  openTab,
}: {
  data: DashData;
  leads: Lead[];
  openLead: (id: number) => void;
  zetStatus: (id: number, s: Status) => Promise<void>;
  openTab: (t: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("alle");
  const [zoek, setZoek] = useState("");
  const [bezigId, setBezigId] = useState<number | null>(null);
  const [fout, setFout] = useState("");

  const tellingen = {
    alle: leads.length,
    nieuw: leads.filter((l) => l.status === "nieuw").length,
    heet: leads.filter((l) => l.warmte >= 75 && leadOpen(l)).length,
    open: leads.filter(leadOpen).length,
    klaar: leads.filter((l) => !leadOpen(l)).length,
  };
  const z = zoek.trim().toLowerCase();
  const lijst = leads.filter((l) => {
    if (filter === "nieuw" && l.status !== "nieuw") return false;
    if (filter === "heet" && !(l.warmte >= 75 && leadOpen(l))) return false;
    if (filter === "open" && !leadOpen(l)) return false;
    if (filter === "klaar" && leadOpen(l)) return false;
    if (z && !`${l.naam} ${l.onderwerp} ${l.reden ?? ""} ${l.herkomst ?? ""}`.toLowerCase().includes(z)) return false;
    return true;
  });
  const alleenVoorbeeld = leads.length > 0 && leads.every((l) => l.voorbeeld);

  async function wijzig(id: number, status: Status) {
    setBezigId(id);
    setFout("");
    try {
      await zetStatus(id, status);
    } catch {
      setFout("The status was not saved. Check your connection and try again.");
    } finally {
      setBezigId(null);
    }
  }

  return (
    <>
      <header className="v-dash__head">
        <h1>Leads</h1>
        <p>Hottest first. Change the status as soon as you’ve been in touch, so your team sees where every lead stands.</p>
      </header>
      {alleenVoorbeeld ? (
        <p className="v-dash__note">
          These are <strong>sample leads</strong> so you can see how the list works. They disappear when your first real lead comes in, or remove them under Settings → Account.
        </p>
      ) : null}
      <div className="v-leadbalk">
        <div aria-label="Filter leads" className="v-instel__nav v-leadbalk__filters" role="tablist">
          {FILTERS.map(([id, label]) => (
            <button aria-current={filter === id ? "page" : undefined} key={id} onClick={() => setFilter(id)} type="button">
              {label} <span className="v-leadbalk__n">{tellingen[id]}</span>
            </button>
          ))}
        </div>
        <input aria-label="Search leads" className="v-leadbalk__zoek" onChange={(e) => setZoek(e.target.value)} placeholder="Search name, topic or town" type="search" value={zoek} />
      </div>
      {fout ? (
        <p className="v-err" role="alert">
          {fout}
        </p>
      ) : null}
      <section className="v-dash__panel v-dash__panel--flush">
        <div className="v-table" role="table">
          <div className="v-table__row v-table__row--head" role="row">
            <span role="columnheader">Warmth</span>
            <span role="columnheader">Customer</span>
            <span role="columnheader">Via</span>
            <span role="columnheader">Received</span>
            <span role="columnheader">Status</span>
          </div>
          {leads.length === 0 ? (
            <div className="v-leeg">
              <p className="v-leeg__titel">No leads yet</p>
              <p>As soon as a visitor leaves their details with AVA, they appear here, hottest first. Three steps to get there:</p>
              <ol className="v-leeg__stappen">
                <li>
                  <button className="v-linkbtn" onClick={() => openTab("ava")} type="button">
                    Tell AVA about your business
                  </button>
                  {data.bedrijfsinfoKlaar ? <em> · done</em> : null}
                </li>
                <li>
                  <button className="v-linkbtn" onClick={() => openTab("installeren")} type="button">
                    Put AVA on your website
                  </button>
                  {data.avaLive ? <em> · live</em> : null}
                </li>
                <li>
                  <a className="v-linkbtn" href={`/demo/${data.sleutel}`} rel="noopener" target="_blank">
                    Test it: chat with AVA as a customer
                  </a>
                </li>
              </ol>
            </div>
          ) : lijst.length === 0 ? (
            <p className="v-feed__empty v-pad">Nothing matches this filter.</p>
          ) : null}
          {lijst.map((l) => (
            <div
              className={`v-table__row v-table__row--klik${l.warmte >= 75 && leadOpen(l) ? " is-heet" : ""}${l.voorbeeld ? " is-voorbeeld" : ""}`}
              key={l.id}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("select")) return;
                openLead(l.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !(e.target as HTMLElement).closest("select")) openLead(l.id);
              }}
              role="row"
              tabIndex={0}
            >
              <span role="cell">
                <span className={`v-heat v-heat--${warmteLabel(l.warmte).toLowerCase()}`} title={l.reden ?? ""}>
                  {l.warmte}
                </span>
              </span>
              <span role="cell">
                <strong>
                  {l.naam}
                  {l.voorbeeld ? <em className="v-voorbeeld-tag">Sample</em> : null}
                </strong>
                <small>{l.reden || l.onderwerp}</small>
                {l.herkomst ? <small className="v-herkomst">📍 {l.herkomst}</small> : null}
              </span>
              <span role="cell">{l.kanaal}</span>
              <span role="cell">{datumAms(sqlDate(l.created_at))}</span>
              <span role="cell">
                <select
                  aria-label={`Status of ${l.naam}`}
                  className={`v-select v-pill--${l.status}`}
                  disabled={bezigId === l.id}
                  onChange={(e) => void wijzig(l.id, e.target.value as Status)}
                  value={l.status}
                >
                  {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABEL[st]}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
