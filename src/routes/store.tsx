import { createFileRoute, redirect } from "@tanstack/react-router";

// The legacy /store page was backed by the old `digital_products` seed table,
// which has no cover images. The real, AI-produced catalog lives at /products,
// so this URL now permanently forwards there.
export const Route = createFileRoute("/store")({
  beforeLoad: () => {
    throw redirect({ to: "/products", replace: true });
  },
});
