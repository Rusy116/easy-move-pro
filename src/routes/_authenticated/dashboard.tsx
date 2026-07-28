import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — the customer workspace now lives at /customer. */
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/customer" });
  },
  component: () => null,
});
