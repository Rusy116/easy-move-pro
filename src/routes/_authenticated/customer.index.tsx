import { createFileRoute, redirect } from "@tanstack/react-router";

/** Canonical customer entry point. */
export const Route = createFileRoute("/_authenticated/customer/")({
  beforeLoad: () => {
    throw redirect({ to: "/customer/dashboard" });
  },
  component: () => null,
});
