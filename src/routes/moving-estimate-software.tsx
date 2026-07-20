import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/moving-estimate-software")({
  head: () => productHead("moving-estimate-software"),
  component: () => <ProductLanding slug="moving-estimate-software" />,
});
