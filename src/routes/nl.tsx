import { createFileRoute, redirect } from "@tanstack/react-router";

/** The landing page is English only. Old links to thevolgo.app/nl go to the landing page. */
export const Route = createFileRoute("/nl")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
