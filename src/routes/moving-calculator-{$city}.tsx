import { createFileRoute, redirect } from "@tanstack/react-router";
import { landingPathForSlug } from "@/lib/city-landing/data";

/**
 * Legacy URL shape (/moving-calculator-glendale-ca). Canonical is now
 * /moving-calculator/glendale-ca — redirect so no link or index entry breaks.
 */
export const Route = createFileRoute("/moving-calculator-{$city}")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: landingPathForSlug(params.city), replace: true });
  },
  component: () => null,
});
