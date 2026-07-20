import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/moving-dispatch-software")({
  head: () => productHead("moving-dispatch-software"),
  component: () => <ProductLanding slug="moving-dispatch-software" />,
});
