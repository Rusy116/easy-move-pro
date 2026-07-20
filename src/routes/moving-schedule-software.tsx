import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/moving-schedule-software")({
  head: () => productHead("moving-schedule-software"),
  component: () => <ProductLanding slug="moving-schedule-software" />,
});
