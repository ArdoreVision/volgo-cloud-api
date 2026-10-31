import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { VolgoNotFound } from "../components/volgo/not-found";
import appCss from "../styles.css?url";
import appMetaJson from "../app-meta.json";

type AppMeta = { og_title?: string | null; og_description?: string | null; og_image_url?: string | null; favicon_url?: string | null };
const meta = appMetaJson as AppMeta;
const title = meta.og_title ?? "Volgo";
const description = meta.og_description ?? "Your website with AVA inside: the AI assistant that follows up on every customer.";

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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Instrument+Sans:wght@400..700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", href: "/favicon.png" },
    ],
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
