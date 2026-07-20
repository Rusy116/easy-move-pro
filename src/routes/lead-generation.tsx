import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/lead-generation")({
  head: () => productHead("lead-generation"),
  component: () => <ProductLanding slug="lead-generation" />,
});
