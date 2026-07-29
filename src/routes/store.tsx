import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Breadcrumbs, InternalLinks, Cta } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema } from "@/lib/seo/schema";
import { STORE_CATEGORIES, categorizeProduct, type StoreCategory } from "@/lib/seo/public-content";

const productsQueryOptions = queryOptions({
  queryKey: ["digital_products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("digital_products")
      .select("*")
      .eq("published", true)
      .order("price_cents");
    if (error) throw error;
    return data;
  },
});

const TITLE = "Digital Moving Products — Checklists, Planners & Templates | Easy Moving";
const DESC =
  "Printable moving checklists, budget planners, inventory trackers and business templates built by professional relocation coordinators.";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESC, path: "/store" }),
    links: [{ rel: "canonical", href: "/store" }],
    scripts: [
      jsonLd(breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Digital store", url: "/store" },
      ])),
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(productsQueryOptions);
  },
  component: StorePage,
});

function StorePage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions);
  const [cat, setCat] = useState<StoreCategory | "all">("all");

  const tagged = useMemo(
    () => products.map((p) => ({ ...p, category: categorizeProduct(p) })),
    [products],
  );
  const visible = cat === "all" ? tagged : tagged.filter((p) => p.category === cat);
  const counts = useMemo(() => {
    const m: Partial<Record<StoreCategory, number>> = {};
    tagged.forEach((p) => { m[p.category] = (m[p.category] ?? 0) + 1; });
    return m;
  }, [tagged]);

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Digital store" }]} />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Digital store</span>
        <h1 className="mt-3 font-serif text-5xl font-medium">Move like a pro.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Templates, trackers, and printable guides built by professional relocation coordinators.
          Purchases appear instantly in your customer portal library.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <CatChip active={cat === "all"} onClick={() => setCat("all")}>
            All ({tagged.length})
          </CatChip>
          {STORE_CATEGORIES.map((c) => (
            <CatChip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
              {c.label} ({counts[c.key] ?? 0})
            </CatChip>
          ))}
        </div>

        {cat !== "all" && (
          <p className="mt-4 text-sm text-muted-foreground">
            {STORE_CATEGORIES.find((c) => c.key === cat)?.blurb}
          </p>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              {p.cover_url ? (
                <img
                  src={p.cover_url}
                  alt={`${p.title} preview`}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              ) : (
                <div
                  className="aspect-[4/3] rounded-xl"
                  style={{ background: "linear-gradient(135deg, oklch(0.94 0.02 155), oklch(0.86 0.05 55))" }}
                />
              )}
              <span className="mt-5 inline-flex w-fit rounded-full border border-border px-2.5 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {STORE_CATEGORIES.find((c) => c.key === p.category)?.label}
              </span>
              <h2 className="mt-3 font-serif text-2xl font-medium">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="font-serif text-2xl">${(p.price_cents / 100).toFixed(2)}</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => toast.info(p.description ?? "Preview coming soon.")}
                  >
                    Preview
                  </Button>
                  <Button
                    className="rounded-full"
                    onClick={() => toast.info("Checkout coming soon — enable payments to accept orders.")}
                  >
                    Buy now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="mt-12 text-muted-foreground">No products in this category yet.</p>
        )}
      </section>

      <InternalLinks
        title="Keep exploring"
        links={[
          { label: "Free resources", to: "/resources" },
          { label: "Moving guides", to: "/blog" },
          { label: "AI moving tools", to: "/ai-tools" },
          { label: "Moving cost calculator", to: "/calculator" },
        ]}
      />
      <Cta
        title="Need a mover, not just a template?"
        subhead="Get an instant itemized moving estimate in about two minutes."
        primaryHref="/calculator"
        primaryLabel="Get my exact quote"
      />
    </SiteLayout>
  );
}

function CatChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
