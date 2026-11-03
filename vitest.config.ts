import { defineConfig } from "vitest/config";
import path from "node:path";

const hier = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(hier, "src"),
      "cloudflare:workers": path.resolve(hier, "test/stubs/cloudflare-workers.ts"),
      "@tanstack/react-start/server": path.resolve(hier, "test/stubs/start-server.ts"),
    },
  },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
