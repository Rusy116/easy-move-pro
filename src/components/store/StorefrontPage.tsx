/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SeoHero, StoreCta, Breadcrumbs } from "@/components/seo/blocks";
import { ProductCard } from "@/components/store/ProductCard";
import { Input } from "@/components/ui/input";
import { money, type PdfProduct } from "@/lib/pdf-store/catalog";

const PAGE_SIZE = 24;

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

/** Shared storefront body used by both /products and /store. */
export function StorefrontPage({ data }: { data: any }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "popular" | "price">("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const all: PdfProduct[] = (
    data?.all?.length
      ? data.all
      : [...(data?.featured ?? []), ...(data?.bestsellers ?? []), ...(data?.newest ?? [])]
  ).filter(
    (p: PdfProduct, i: number, arr: PdfProduct[]) =>
      arr.findIndex((x) => x.slug === p.slug) === i,
  );

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

  const browse = [...all]
    .filter((p) => (cat ? p.category_slug === cat : true))
    .sort((a, b) =>
      sort === "popular"
        ? Number(b.downloads ?? 0) - Number(a.downloads ?? 0)
        : sort === "price"
          ? a.price_cents - b.price_cents
          : String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")),
    );

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Store" }]} />
      <SeoHero
        eyebrow="Digital store"
        title="Printable moving checklists, planners and templates"
        subhead="Every document is built from real US moves, print-ready and yours to keep. Download instantly."
        hidePrimary
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
          {(data?.categories ?? []).map((c: { slug: string; name: string }) => (
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
          <Shelf title="Featured" items={data?.featured ?? []} />
          <Shelf title="Bestsellers" items={data?.bestsellers ?? []} />
          <Shelf title="Free downloads" blurb="Start here — no payment required." items={free} />
          <Shelf title="New releases" items={data?.newest ?? []} />

          {all.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl">All products ({browse.length})</h2>
                <select
                  aria-label="Sort products"
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as typeof sort); setVisible(PAGE_SIZE); }}
                  className="h-9 rounded-full border border-border/70 bg-background px-3 text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Most downloaded</option>
                  <option value="price">Price: low to high</option>
                </select>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setCat(null); setVisible(PAGE_SIZE); }}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${cat === null ? "border-primary bg-primary/10" : "border-border/70 hover:bg-muted"}`}
                >
                  All
                </button>
                {(data?.categories ?? []).map((c: { slug: string; name: string }) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => { setCat(c.slug); setVisible(PAGE_SIZE); }}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${cat === c.slug ? "border-primary bg-primary/10" : "border-border/70 hover:bg-muted"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {browse.slice(0, visible).map((p) => (
                  <ProductCard key={p.slug} p={p} />
                ))}
              </div>
              {visible < browse.length && (
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="rounded-full border border-border/70 px-6 py-2 text-sm transition hover:bg-muted"
                  >
                    Load more ({browse.length - visible} left)
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {data?.unavailable ? (
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <p className="font-serif text-xl">The store is temporarily unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't load the catalog just now. Please refresh in a moment — your downloads and
            purchases are unaffected.
          </p>
        </div>
      ) : (
        all.length === 0 && (
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <p className="font-serif text-xl">The store is being stocked</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Our product factory is generating the first titles. Check back shortly.
            </p>
          </div>
        )
      )}

      <StoreCta />
    </SiteLayout>
  );
}
