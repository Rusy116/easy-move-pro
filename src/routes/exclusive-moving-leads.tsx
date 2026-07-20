import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/exclusive-moving-leads")({
  head: () => productHead("exclusive-moving-leads"),
  component: () => <ProductLanding slug="exclusive-moving-leads" />,
});
