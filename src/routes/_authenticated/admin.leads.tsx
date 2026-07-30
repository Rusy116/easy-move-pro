import { createFileRoute } from "@tanstack/react-router";
import { AdminLeadsWorkspace } from "@/components/admin/AdminLeadsWorkspace";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({ meta: [{ title: "Leads — Easy Moving" }] }),
  component: AdminLeadsWorkspace,
});
