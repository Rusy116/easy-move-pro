import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// ────────────────────────────── Hero ──────────────────────────────
export function SeoHero({
  eyebrow,
  title,
  subhead,
  primaryHref = "/join",
  primaryLabel = "Become a partner",
  secondaryHref,
  secondaryLabel,
  hidePrimary = false,
}: {
  eyebrow?: string;
  title: string;
  subhead: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Digital store pages hide the partner CTA — it belongs to mover pages. */
  hidePrimary?: boolean;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="inline-block rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 font-serif text-4xl md:text-6xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{subhead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!hidePrimary && (
              <Link to={primaryHref as "/join"}>
                <Button size="lg" className="rounded-full">
                  {primaryLabel}
                </Button>
              </Link>
            )}
            {secondaryHref && secondaryLabel && (
              <Link to={secondaryHref as "/moving-leads"}>
                <Button variant="outline" size="lg" className="rounded-full">
                  {secondaryLabel}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── Feature grid ──────────────────────────────
export function FeatureGrid({
  title,
  items,
}: {
  title?: string;
  items: Array<{ title: string; body: string }>;
}) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        {title && (
          <h2 className="mb-10 font-serif text-3xl md:text-4xl font-semibold tracking-tight">
            {title}
          </h2>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Check className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── Benefits (2-col) ──────────────────────────────
export function Benefits({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; body: string }>;
}) {
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <h2 className="max-w-3xl font-serif text-3xl md:text-4xl font-semibold tracking-tight">
          {title}
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {items.map((it) => (
            <div key={it.title} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{it.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── Statistics ──────────────────────────────
export function Statistics({ items }: { items: Array<{ value: string; label: string }> }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-serif text-4xl md:text-5xl font-semibold text-primary">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── FAQ ──────────────────────────────
export function Faq({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <button
                key={it.q}
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full px-6 py-5 text-left"
                aria-expanded={isOpen}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-foreground">{it.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
                {isOpen && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.a}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── Testimonials ──────────────────────────────
const DEFAULT_TESTIMONIALS = [
  {
    name: "Marcus R.",
    company: "Northstar Movers, Denver",
    body: "We went from 4 jobs a week to 18 in six months. The exclusive leads changed everything.",
  },
  {
    name: "Priya S.",
    company: "Bay Area Relocations, San Jose",
    body: "The estimate builder alone saves our sales team 10 hours a week. And customers actually understand the price.",
  },
  {
    name: "Jamal T.",
    company: "Peach State Moving, Atlanta",
    body: "Best money we spend. Real leads, real customers, no shared list nonsense.",
  },
];

export function Testimonials({
  items = DEFAULT_TESTIMONIALS,
}: {
  items?: typeof DEFAULT_TESTIMONIALS;
}) {
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">
          Trusted by moving companies nationwide
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground">"{t.body}"</p>
              <p className="mt-4 text-xs font-medium text-muted-foreground">
                {t.name} · {t.company}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── Comparison Table ──────────────────────────────
export function ComparisonTable({
  competitor,
  rows,
}: {
  competitor: string;
  rows: Array<{ feature: string; easy: string; them: string }>;
}) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-muted-foreground">Feature</th>
                <th className="px-6 py-4 text-left font-semibold text-primary">Easy Moving</th>
                <th className="px-6 py-4 text-left font-medium text-muted-foreground">
                  {competitor}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.feature} className="bg-card">
                  <td className="px-6 py-4 font-medium text-foreground">{r.feature}</td>
                  <td className="px-6 py-4 text-foreground">{r.easy}</td>
                  <td className="px-6 py-4 text-muted-foreground">{r.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── Partner logos ──────────────────────────────
export function PartnerLogos() {
  const items = [
    "Northstar Movers",
    "Peach State Moving",
    "Bay Area Relocations",
    "Coastal Van Lines",
    "Summit Movers",
    "Cardinal Moving Co.",
  ];
  return (
    <section className="border-b border-border bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Trusted by moving companies across the U.S.
        </p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {items.map((n) => (
            <div
              key={n}
              className="flex h-14 items-center justify-center rounded-lg border border-border bg-card text-xs font-medium tracking-wide text-muted-foreground"
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── CTA ──────────────────────────────
export function Cta({
  title = "Ready to grow your moving business?",
  subhead = "Apply to join Easy Moving. Approval takes 1–3 business days.",
  primaryHref = "/join",
  primaryLabel = "Apply to become a partner",
}: {
  title?: string;
  subhead?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <section className="border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-4 text-base opacity-90">{subhead}</p>
        <div className="mt-8">
          <Link to={primaryHref as "/join"}>
            <Button size="lg" variant="secondary" className="rounded-full">
              {primaryLabel}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Store-specific CTA. The public digital store must never send customers to
 * the mover/partner marketplace, so it keeps its own copy and links.
 */
export function StoreCta() {
  return (
    <section className="border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">
          Plan your move with print-ready documents
        </h2>
        <p className="mt-4 text-base opacity-90">
          Checklists, budget planners, inventory sheets and labels — download instantly and keep
          them in your library.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/products">
            <Button size="lg" variant="secondary" className="rounded-full">
              Browse all products
            </Button>
          </Link>
          <Link to="/calculator">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              Get a moving quote
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────── Breadcrumbs ──────────────────────────────
export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-border bg-muted/20">
      <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 sm:px-6 py-3 text-xs text-muted-foreground">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="opacity-50">/</span>}
            {it.to ? (
              <Link to={it.to as "/"} className="hover:text-foreground">
                {it.label}
              </Link>
            ) : (
              <span className="text-foreground">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ────────────────────────────── Internal link cloud ──────────────────────────────
export function InternalLinks({
  title = "Explore more",
  links,
}: {
  title?: string;
  links: Array<{ label: string; to: string }>;
}) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to as "/"}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
