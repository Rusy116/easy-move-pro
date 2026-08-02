import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — account management now lives under Brokers / Customers / Companies. */
export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/brokers" });
  },
  component: () => null,
});
