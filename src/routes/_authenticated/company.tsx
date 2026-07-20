import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CompanyShell } from "@/components/company/CompanyShell";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({ meta: [{ title: "Moving Company Portal — Easy Moving" }] }),
  component: () => (
    <CompanyShell>
      <Outlet />
    </CompanyShell>
  ),
});
