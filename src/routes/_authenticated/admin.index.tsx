import { createFileRoute } from "@tanstack/react-router";
import { AdminLeadsWorkspace } from "@/components/admin/AdminLeadsWorkspace";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Easy Moving" }] }),
  component: AdminLeadsWorkspace,
});
