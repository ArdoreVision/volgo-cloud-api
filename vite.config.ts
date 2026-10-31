import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defaultServerConditions, defineConfig } from "vite";

// Volgo draait als één Cloudflare Worker: de server-bundel (dist/server/server.js)
// plus statische bestanden (dist/client).
export default defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  ssr: {
    ...(command === "build"
      ? {
          target: "webworker" as const,
          resolve: { conditions: ["workerd", "worker", "browser", ...defaultServerConditions.filter((c) => c !== "node")] },
        }
      : {}),
    noExternal: command === "build" ? true : undefined,
    external: ["cloudflare:workers"],
  },
  build: { rollupOptions: { external: [/^cloudflare:/] } },
  plugins: [tanstackStart({ server: { entry: "server" } }), react()],
}));
