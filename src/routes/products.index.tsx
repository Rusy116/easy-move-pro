/* eslint-disable @typescript-eslint/no-explicit-any */
import { cachePublicPage } from "@/lib/http-cache";
import { createFileRoute } from "@tanstack/react-router";
import { StorefrontPage } from "@/components/store/StorefrontPage";
import { storefront } from "@/lib/pdf-store.functions";
import { seoMeta, jsonLd, breadcrumbSchema, absoluteUrl } from "@/lib/seo/schema";

export const Route = createFileRoute("/products/")({
  loader: async () => {
    await cachePublicPage(600);
    return storefront();
  },
  head: () => ({
    meta: seoMeta({
      title: "Printable Moving Checklists, Planners & Templates — Easy Moving",
      description:
        "Download printable moving checklists, budget worksheets, packing guides and inventory sheets built by the Easy Moving team. Instant PDF downloads.",
      path: "/products",
    }),
    links: [{ rel: "canonical", href: absoluteUrl("/products") }],
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Store", url: "/products" }]))],
  }),
  component: StoreHome,
  errorComponent: () => <StorefrontPage data={{ ...EMPTY, unavailable: true }} />,
  notFoundComponent: () => <StorefrontPage data={EMPTY} />,
});

const EMPTY = { categories: [], featured: [], bestsellers: [], newest: [], total: 0 };

function StoreHome() {
  const data = Route.useLoaderData() as any;
  return <StorefrontPage data={data ?? EMPTY} />;
}
