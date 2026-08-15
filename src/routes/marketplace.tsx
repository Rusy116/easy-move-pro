/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { StorefrontPage } from "@/components/store/StorefrontPage";
import { storefront } from "@/lib/pdf-store.functions";
import { seoMeta, jsonLd, breadcrumbSchema, absoluteUrl } from "@/lib/seo/schema";

// PUBLIC marketplace = digital products store only.
// The moving-company marketplace lives exclusively in the CRM under
// /_authenticated/company/marketplace and /_authenticated/admin/marketplace.
export const Route = createFileRoute("/marketplace")({
  loader: () => storefront(),
  head: () => ({
    meta: seoMeta({
      title: "Digital Marketplace — Printable Moving Checklists & Planners | Easy Moving",
      description:
        "Shop the Easy Moving digital marketplace: printable moving checklists, budget planners, packing guides, inventory templates and labels. Instant PDF downloads.",
      path: "/marketplace",
    }),
    links: [{ rel: "canonical", href: absoluteUrl("/products") }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Store", url: "/products" },
        ]),
      ),
    ],
  }),
  component: MarketplacePage,
  errorComponent: () => <StorefrontPage data={{ ...EMPTY, unavailable: true }} />,
  notFoundComponent: () => <StorefrontPage data={EMPTY} />,
});

const EMPTY = { categories: [], featured: [], bestsellers: [], newest: [], total: 0 };

function MarketplacePage() {
  const data = Route.useLoaderData() as any;
  return <StorefrontPage data={data ?? EMPTY} />;
}
