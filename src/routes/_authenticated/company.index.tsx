import { createFileRoute, redirect } from "@tanstack/react-router";

/** Canonical company entry point — the hub page stays available at /company/hub. */
export const Route = createFileRoute("/_authenticated/company/")({
  beforeLoad: () => {
    throw redirect({ to: "/company/dashboard" });
  },
  component: () => null,
});
