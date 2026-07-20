import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/moving-company-software")({
  head: () => productHead("moving-company-software"),
  component: () => <ProductLanding slug="moving-company-software" />,
});
