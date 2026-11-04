import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { VolgoNotFound } from "../components/volgo/not-found";
import appCss from "../styles.css?url";
import appMetaJson from "../app-meta.json";

type AppMeta = { og_title?: string | null; og_description?: string | null; og_image_url?: string | null; favicon_url?: string | null };
const meta = appMetaJson as AppMeta;
const title = meta.og_title ?? "Volgo";
const description = meta.og_description ?? "AVA answers every website visitor 24/7 and turns them into leads and quotes.";
const SITE = "https://thevolgo.app";

/** Structured data for search engines: who we are and what the product is. */
const LD_ORGANISATIE = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Volgo",
      legalName: "Hanssens Cornerstone Capital",
      url: SITE,
      logo: `${SITE}/icon-512.png`,
      email: "volgo.app@outlook.com",
      founder: { "@type": "Person", name: "Damien Hanssens" },
      address: { "@type": "PostalAddress", addressLocality: "Vlissingen", addressCountry: "NL" },
      sameAs: ["https://www.instagram.com/thevolgo.app/", "https://x.com/VolgoApp"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE}/#software`,
      name: "Volgo",
      alternateName: "AVA by Volgo",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE,
      description,
      publisher: { "@id": `${SITE}/#organization` },
      featureList: [
        "AI assistant that answers website visitors 24/7",
        "Lead capture with warmth score 0–100",
        "Appointment booking inside the chat",
        "Hot-lead emails and daily morning summary",
        "Lead pipeline from new to quote to won",
        "Custom website built and hosted with AVA inside (Pro and Premium)",
      ],
      offers: [
        { "@type": "Offer", name: "Start", price: "147", priceCurrency: "EUR", url: `${SITE}/pricing`, category: "subscription" },
        { "@type": "Offer", name: "Pro", price: "497", priceCurrency: "EUR", url: `${SITE}/pricing`, category: "subscription" },
        { "@type": "Offer", name: "Premium", price: "997", priceCurrency: "EUR", url: `${SITE}/pricing`, category: "subscription" },
      ],
    },
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "Volgo", publisher: { "@id": `${SITE}/#organization` }, inLanguage: "en" },
  ],
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "white" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Volgo" },
      { title },
      { name: "description", content: description },
      { name: "author", content: "Volgo, a service by Hanssens Cornerstone Capital" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: "Volgo" },
      { property: "og:url", content: SITE },
      { name: "twitter:site", content: "@VolgoApp" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: meta.og_image_url ? "summary_large_image" : "summary" },
      ...(meta.og_image_url
        ? [
            { property: "og:image", content: meta.og_image_url },
            { name: "twitter:image", content: meta.og_image_url },
          ]
        : []),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Instrument+Sans:wght@400..700&family=Josefin+Sans:wght@300;400;600&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", href: "/favicon.png" },
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(LD_ORGANISATIE) }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => <VolgoNotFound />,
  errorComponent: ({ error }) => {
    console.error(error);
    return <VolgoNotFound />;
  },
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
