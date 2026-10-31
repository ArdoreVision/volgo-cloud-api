import { createFileRoute, redirect } from "@tanstack/react-router";

import { AvaChat } from "@/components/volgo/ava-chat";
import { Bento } from "@/components/volgo/bento";
import { Demo } from "@/components/volgo/demo";
import { Faq } from "@/components/volgo/faq";
import { Footer } from "@/components/volgo/footer";
import { Hero } from "@/components/volgo/hero";
import { Nav } from "@/components/volgo/nav";
import { Problem } from "@/components/volgo/problem";
import { Sectors } from "@/components/volgo/sectors";
import { Signup } from "@/components/volgo/signup";
import { isIngelogd } from "@/lib/api/assistent.functions";
import "@/volgo.css";

export const Route = createFileRoute("/")({
  // Ingelogd? Dan direct naar je Volgo-home in plaats van de landingspagina.
  beforeLoad: async () => {
    if (await isIngelogd()) throw redirect({ to: "/dashboard" });
  },
  component: Index,
});

function Index() {
  return (
    <div className="volgo">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Demo />
        <Bento />
        <Sectors />
        <Faq />
        <Signup />
      </main>
      <Footer />
      <AvaChat />
    </div>
  );
}
