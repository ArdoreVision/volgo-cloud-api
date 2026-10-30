import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import "@/volgo.css";

// Voorbeeldwebsite van een klant met AVA erin: zo ziet een bezoeker het.
export const Route = createFileRoute("/demo/$sleutel")({
  head: () => ({ meta: [{ title: "Voorbeeldwebsite met AVA" }, { name: "robots", content: "noindex" }] }),
  component: Demo,
});

function Demo() {
  const { sleutel } = Route.useParams();
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "/ava.js";
    s.defer = true;
    s.setAttribute("data-key", sleutel);
    document.body.appendChild(s);
  }, [sleutel]);
  return (
    <div className="volgo v-demo-site">
      <div className="v-demo-site__bar">
        Voorbeeldwebsite · zo ziet AVA eruit op de site van je klant. <a href="/dashboard">Terug naar dashboard</a>
      </div>
      <header className="v-demo-site__nav">
        <strong>Jouw bedrijf</strong>
        <nav>
          <span>Diensten</span>
          <span>Over ons</span>
          <span>Contact</span>
        </nav>
      </header>
      <main className="v-demo-site__hero">
        <h1>Vakwerk, op tijd en zonder gedoe.</h1>
        <p>Dit is een voorbeeldpagina. Klik rechtsonder op AVA en stel een vraag, zoals een echte bezoeker. Het gesprek verschijnt live in je dashboard.</p>
      </main>
    </div>
  );
}
