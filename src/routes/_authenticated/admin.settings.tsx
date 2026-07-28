import { createFileRoute, redirect } from "@tanstack/react-router";

// /admin/settings is an alias for the existing team & account administration page.
export const Route = createFileRoute("/_authenticated/admin/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/users" });
  },
});
