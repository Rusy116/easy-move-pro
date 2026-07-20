import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/open-marketplace")({
  head: () => productHead("open-marketplace"),
  component: () => <ProductLanding slug="open-marketplace" />,
});
