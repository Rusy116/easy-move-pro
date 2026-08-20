import { createFileRoute, redirect } from "@tanstack/react-router";

/** Friendly alias: /client → the existing customer portal. */
export const Route = createFileRoute("/_authenticated/client/")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/dashboard" });
  },
  component: () => null,
});
