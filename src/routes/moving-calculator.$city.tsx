import { createFileRoute, redirect } from "@tanstack/react-router";
import { landingPathForSlug } from "@/lib/city-landing/data";

/**
 * Legacy nested shape (/moving-calculator/dallas-tx). Canonical is the flat
 * /moving-calculator-dallas-tx — redirect so no old link or index entry breaks.
 */
export const Route = createFileRoute("/moving-calculator/$city")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: landingPathForSlug(params.city), replace: true });
  },
  component: () => null,
});
