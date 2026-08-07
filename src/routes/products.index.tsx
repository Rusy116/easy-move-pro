import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SeoHero, Cta, Breadcrumbs } from "@/components/seo/blocks";
import { ProductCard } from "@/components/store/ProductCard";
import { storefront } from "@/lib/pdf-store.functions";
import { seoMeta, jsonLd, breadcrumbSchema } from "@/lib/seo/schema";

export const Route = createFileRoute("/products/")({
  loader: () => storefront(),
  head: () => ({
    meta: seoMeta({
      title: "Printable Moving Checklists, Planners & Templates — Easy Moving",
      description:
        "Download printable moving checklists, budget worksheets, packing guides and inventory sheets built by the Easy Moving team. Instant PDF downloads.",
      path: "/products",
    }),
    links: [{ rel: "canonical", href: "/products" }],
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Store", url: "/products" }]))],
  }),
  component: StoreHome,
});

function Shelf({ title, items }: { title: string; items: ReturnType<typeof Object.values> }) {
  const list = items as any[];
  if (!list.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h2 className="mb-4 font-serif text-2xl">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.slug} p={p} />
        ))}
      </div>
    </section>
  );
}

function StoreHome() {
  const data = Route.useLoaderData();

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Store" }]} />
      <SeoHero
        eyebrow="Digital store"
        title="Printable moving checklists, planners and templates"
        subhead="Every document is built from real US moves, print-ready and yours to keep. Download instantly."
      />

      <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {data.categories.map((c: { slug: string; name: string }) => (
            <Link
              key={c.slug}
              to="/products/category/$slug"
              params={{ slug: c.slug }}
              className="rounded-full border border-border/70 px-4 py-1.5 text-sm transition hover:bg-muted"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <Shelf title="Featured" items={data.featured} />
      <Shelf title="Bestsellers" items={data.bestsellers} />
      <Shelf title="New releases" items={data.newest} />

      {data.total === 0 && (
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <p className="font-serif text-xl">The store is being stocked</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Our product factory is generating the first titles. Check back shortly.
          </p>
        </div>
      )}

      <Cta />
    </SiteLayout>
  );
}
