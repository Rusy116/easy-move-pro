import { createFileRoute } from "@tanstack/react-router";
import { ProductLanding, productHead } from "@/components/seo/ProductLanding";
export const Route = createFileRoute("/moving-company-crm")({
  head: () => productHead("moving-company-crm"),
  component: () => <ProductLanding slug="moving-company-crm" />,
});
