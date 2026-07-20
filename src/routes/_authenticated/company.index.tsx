import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/company/")({
  beforeLoad: () => { throw redirect({ to: "/company/dashboard" }); },
});
