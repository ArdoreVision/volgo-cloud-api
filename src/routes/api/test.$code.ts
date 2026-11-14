import { createFileRoute } from "@tanstack/react-router";

import { TEST_COOKIE, isTestCode } from "@/lib/testprijs.server";

// Private test link: /api/test/<code> switches €0 test pricing on for this browser, /api/test/off switches it off.
export const Route = createFileRoute("/api/test/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const aan = await isTestCode(params.code);
        if (!aan && params.code !== "off") return new Response("Not found", { status: 404 });
        const cookie = aan
          ? `${TEST_COOKIE}=${params.code}; Path=/; Max-Age=172800; HttpOnly; Secure; SameSite=Lax`
          : `${TEST_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
        return new Response(null, { status: 303, headers: { Location: new URL("/pricing", request.url).toString(), "Set-Cookie": cookie, "Cache-Control": "no-store" } });
      },
    },
  },
});
