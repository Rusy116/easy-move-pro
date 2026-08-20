import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Alias layer only — the client portal itself is the existing customer
 * workspace under /customer/*. Any /client/<page> URL maps 1:1 to it so no
 * dashboard is duplicated.
 */
const CUSTOMER_PAGES = new Set([
  "dashboard",
  "move",
  "quotes",
  "messages",
  "documents",
  "notifications",
  "library",
  "purchases",
  "reviews",
  "settings",
]);

export const Route = createFileRoute("/_authenticated/client/$")({
  beforeLoad: ({ params }) => {
    const first = (params._splat ?? "").split("/")[0] ?? "";
    const page = CUSTOMER_PAGES.has(first) ? first : "dashboard";
    throw redirect({ to: `/customer/${page}` as never });
  },
  component: () => null,
});
