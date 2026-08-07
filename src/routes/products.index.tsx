/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SeoHero, Cta, Breadcrumbs } from "@/components/seo/blocks";
import { ProductCard } from "@/components/store/ProductCard";
import { Input } from "@/components/ui/input";
import { storefront } from "@/lib/pdf-store.functions";
import { money, type PdfProduct } from "@/lib/pdf-store/catalog";
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

function Shelf({ title, blurb, items }: { title: string; blurb?: string; items: PdfProduct[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h2 className="font-serif text-2xl">{title}</h2>
      {blurb && <p className="mb-4 mt-1 text-sm text-muted-foreground">{blurb}</p>}
      <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-4 ${blurb ? "" : "mt-4"}`}>
        {items.map((p) => (
          <ProductCard key={p.slug} p={p} />
        ))}
      </div>
    </section>
  );
}

function StoreHome() {
  const data = Route.useLoaderData() as any;
  const [q, setQ] = useState("");

  const all: PdfProduct[] = [
    ...(data.featured ?? []),
    ...(data.bestsellers ?? []),
    ...(data.newest ?? []),
  ].filter((p, i, arr) => arr.findIndex((x) => x.slug === p.slug) === i);

  const needle = q.trim().toLowerCase();
  const results = needle
    ? all.filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          (p.subtitle ?? "").toLowerCase().includes(needle) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(needle)),
      )
    : [];

  const free = all.filter((p) => p.price_cents === 0).slice(0, 4);
  const priced = [...all].filter((p) => p.price_cents > 0);
  const avg = priced.length
    ? Math.round(priced.reduce((n, p) => n + p.price_cents, 0) / priced.length)
    : 0;

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Store" }]} />
      <SeoHero
        eyebrow="Digital store"
        title="Printable moving checklists, planners and templates"
        subhead="Every document is built from real US moves, print-ready and yours to keep. Download instantly."
      />

      <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <label className="sr-only" htmlFor="store-search">
          Search products
        </label>
        <Input
          id="store-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search checklists, planners, packing guides…"
          className="h-11 rounded-full"
        />
        {avg > 0 && !needle && (
          <p className="mt-2 text-xs text-muted-foreground">
            {priced.length} paid titles · average {money(avg)} · {free.length} free downloads
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {(data.categories ?? []).map((c: { slug: string; name: string }) => (
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

      {needle ? (
        results.length ? (
          <Shelf title={`${results.length} results for “${q}”`} items={results} />
        ) : (
          <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground sm:px-6">
            Nothing matched “{q}”. Try “checklist”, “budget” or “packing”.
          </p>
        )
      ) : (
        <>
          <Shelf title="Featured" items={data.featured ?? []} />
          <Shelf title="Bestsellers" items={data.bestsellers ?? []} />
          <Shelf title="Free downloads" blurb="Start here — no payment required." items={free} />
          <Shelf title="New releases" items={data.newest ?? []} />
        </>
      )}

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
