/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { StorefrontPage } from "@/components/store/StorefrontPage";
import { storefront } from "@/lib/pdf-store.functions";
import { seoMeta, jsonLd, breadcrumbSchema, absoluteUrl } from "@/lib/seo/schema";

// /store is the historical storefront URL. It renders the real AI-produced
// catalog (same data as /products) instead of throwing a redirect, which had
// no route output and made the page fail to load on built deployments.
export const Route = createFileRoute("/store")({
  loader: () => storefront(),
  head: () => ({
    meta: seoMeta({
      title: "Moving PDF Store — Printable Checklists & Planners | Easy Moving",
      description:
        "Browse the Easy Moving digital store: printable moving checklists, budget worksheets, packing guides and inventory sheets. Instant PDF downloads.",
      path: "/store",
    }),
    links: [{ rel: "canonical", href: absoluteUrl("/products") }],
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Store", url: "/store" }]))],
  }),
  component: StorePage,
  errorComponent: () => <StorefrontPage data={{ ...EMPTY, unavailable: true }} />,
  notFoundComponent: () => <StorefrontPage data={EMPTY} />,
});

const EMPTY = { categories: [], featured: [], bestsellers: [], newest: [], total: 0 };

function StorePage() {
  const data = Route.useLoaderData() as any;
  return <StorefrontPage data={data ?? EMPTY} />;
}
