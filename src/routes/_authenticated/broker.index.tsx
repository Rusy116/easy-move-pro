import { createFileRoute, redirect } from "@tanstack/react-router";

/** Canonical broker entry point. */
export const Route = createFileRoute("/_authenticated/broker/")({
  beforeLoad: () => {
    throw redirect({ to: "/broker/dashboard" });
  },
  component: () => null,
});
