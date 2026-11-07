import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import "@/volgo.css";

// Voorbeeldwebsite van een klant met Volgo erin: zo ziet een bezoeker het.
export const Route = createFileRoute("/demo/$sleutel")({
  head: () => ({ meta: [{ title: "Sample website with Volgo" }, { name: "robots", content: "noindex" }] }),
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
        Sample website · this is how Volgo looks on your website. <a href="/dashboard">Back to dashboard</a>
      </div>
      <header className="v-demo-site__nav">
        <strong>Your business</strong>
        <nav>
          <span>Services</span>
          <span>About</span>
          <span>Contact</span>
        </nav>
      </header>
      <main className="v-demo-site__hero">
        <h1>Quality work, on time, no hassle.</h1>
        <p>This is a sample page. Click Volgo in the bottom right and ask a question like a real visitor would. The conversation appears live in your dashboard.</p>
      </main>
    </div>
  );
}
