import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/moving-leads")({
  head: () => productHead("moving-leads"),
  component: () => <ProductLanding slug="moving-leads" />,
});
