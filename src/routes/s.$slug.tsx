import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";

import { haalPubliekeSite } from "@/lib/api/site.functions";
import { LABELS, type SiteData } from "@/lib/site";
import "@/site.css";

export const Route = createFileRoute("/s/$slug")({
  validateSearch: (s: Record<string, unknown>): { preview?: string } => ({ preview: s.preview ? "1" : undefined }),
  loaderDeps: ({ search }) => ({ preview: Boolean(search.preview) }),
  loader: async ({ params, deps }) => {
    const r = await haalPubliekeSite({ data: { slug: params.slug, preview: deps.preview } });
    if (!r) throw notFound();
    return r;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.site.tagline ? `${loaderData.site.naam} · ${loaderData.site.tagline}` : loaderData.site.naam },
          { name: "description", content: loaderData.site.hero.tekst.slice(0, 160) },
          ...(loaderData.concept ? [{ name: "robots", content: "noindex" }] : []),
        ]
      : [],
  }),
  component: KlantSite,
});

declare global {
  interface Window {
    VolgoAva?: { open: () => void; close: () => void };
  }
}

export function SiteWeergave({ site, concept = false }: { site: SiteData; concept?: boolean }) {
  const openAva = () => window.VolgoAva?.open();
  const L = LABELS[site.taal] ?? LABELS.en;
  const c = site.contact;
  const heeftContact = c.telefoon || c.email || c.adres || c.openingstijden;
  return (
    <div className={`vs vs--${site.stijl}`} lang={site.taal} style={{ ["--vs-kleur" as string]: site.kleur }}>
      {concept ? <p className="vs-concept">{L.preview}</p> : null}
      <header className="vs-nav">
        <strong>{site.naam}</strong>
        <nav>
          {site.diensten.length ? <a href="#services">{L.services}</a> : null}
          {site.over.tekst ? <a href="#about">{L.about}</a> : null}
          {heeftContact ? <a href="#contact">{L.contact}</a> : null}
          <button onClick={openAva} type="button">
            {site.hero.knop || "Ask AVA"}
          </button>
        </nav>
      </header>

      <section className="vs-hero">
        {site.tagline ? <p className="vs-tag">{site.tagline}</p> : null}
        <h1>{site.hero.titel}</h1>
        <p>{site.hero.tekst}</p>
        <div className="vs-hero__acties">
          <button className="vs-btn" onClick={openAva} type="button">
            {site.hero.knop || "Ask AVA"}
          </button>
          {c.telefoon ? (
            <a className="vs-btn vs-btn--ghost" href={`tel:${c.telefoon.replace(/[^\d+]/g, "")}`}>
              {L.call} {c.telefoon}
            </a>
          ) : null}
        </div>
      </section>

      {site.diensten.length ? (
        <section className="vs-sectie" id="services">
          <h2>{L.services}</h2>
          <ul className="vs-grid">
            {site.diensten.map((d, i) => (
              <li key={i}>
                <h3>{d.titel}</h3>
                <p>{d.tekst}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {site.over.tekst ? (
        <section className="vs-sectie vs-over" id="about">
          <h2>{site.over.titel || L.about}</h2>
          <p>{site.over.tekst}</p>
        </section>
      ) : null}

      {site.reviews.length ? (
        <section className="vs-sectie">
          <h2>{L.reviews}</h2>
          <ul className="vs-grid vs-reviews">
            {site.reviews.map((r, i) => (
              <li key={i}>
                <p>“{r.tekst}”</p>
                <strong>{r.naam}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {site.faq.length ? (
        <section className="vs-sectie vs-faq">
          <h2>{L.faq}</h2>
          {site.faq.map((f, i) => (
            <details key={i}>
              <summary>{f.vraag}</summary>
              <p>{f.antwoord}</p>
            </details>
          ))}
        </section>
      ) : null}

      <section className="vs-sectie vs-contact" id="contact">
        <h2>{L.contact}</h2>
        <div className="vs-contact__kaart">
          <div>
            {c.telefoon ? <p><span>{L.phone}</span><a href={`tel:${c.telefoon.replace(/[^\d+]/g, "")}`}>{c.telefoon}</a></p> : null}
            {c.email ? <p><span>{L.email}</span><a href={`mailto:${c.email}`}>{c.email}</a></p> : null}
            {c.adres ? <p><span>{L.address}</span>{c.adres}</p> : null}
            {c.openingstijden ? <p><span>{L.hours}</span>{c.openingstijden}</p> : null}
          </div>
          <div className="vs-contact__ava">
            <p>{L.fastest}</p>
            <button className="vs-btn" onClick={openAva} type="button">
              {site.hero.knop || "Ask AVA"}
            </button>
          </div>
        </div>
      </section>

      <footer className="vs-footer">
        <span>© {new Date().getFullYear()} {site.naam}</span>
        <a href="https://thevolgo.app" rel="noopener" target="_blank">
          {L.built}
        </a>
      </footer>
    </div>
  );
}

function KlantSite() {
  const { site, sleutel, concept } = Route.useLoaderData();
  useEffect(() => {
    if (!sleutel || document.querySelector("script[data-volgo-ava]")) return;
    const s = document.createElement("script");
    s.src = "/ava.js";
    s.dataset.key = sleutel;
    s.dataset.volgoAva = "1";
    document.body.appendChild(s);
  }, [sleutel]);
  return <SiteWeergave concept={concept} site={site} />;
}
