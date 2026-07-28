import { createFileRoute, redirect } from "@tanstack/react-router";

// /admin/leads is an alias for the existing quotes/leads CRM at /admin.
export const Route = createFileRoute("/_authenticated/admin/leads")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
