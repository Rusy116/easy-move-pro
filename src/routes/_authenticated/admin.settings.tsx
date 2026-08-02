import { createFileRoute, redirect } from "@tanstack/react-router";

// /admin/settings is an alias for team & account administration.
export const Route = createFileRoute("/_authenticated/admin/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/brokers" });
  },
});
