import { createFileRoute, redirect } from "@tanstack/react-router";
import { landingPathFor } from "@/lib/city-landing/data";
import { CITIES } from "./cities.index";

/**
 * /cities/{city} is no longer a competing SEO page. The canonical city URL is
 * the flat calculator page (/moving-calculator-dallas-tx), so every legacy
 * city URL permanently redirects there.
 */
export const Route = createFileRoute("/cities/$city")({
  beforeLoad: ({ params }) => {
    const city = CITIES.find((c) => c.slug === params.city);
    throw redirect({
      to: city ? landingPathFor(city.slug, city.state) : "/cities",
      replace: true,
    });
  },
  component: () => null,
});
