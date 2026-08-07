import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { CoverArt } from "@/components/store/CoverArt";
import { money, type PdfProduct } from "@/lib/pdf-store/catalog";

export function ProductCard({ p }: { p: PdfProduct }) {
  return (
    <Link
      to="/products/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {p.cover_url ? (
          <img
            src={p.cover_url}
            alt={p.alt_text ?? `${p.title} — printable moving PDF cover`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <CoverArt
            slug={p.slug}
            title={p.title}
            spec={p.cover_spec}
            className="h-full w-full transition duration-300 group-hover:scale-[1.03]"
          />
        )}
        {p.is_bestseller && <Badge className="absolute left-3 top-3 rounded-full">Bestseller</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-serif text-lg leading-tight">{p.title}</h3>
        {p.subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{p.subtitle}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="flex items-baseline gap-2 text-sm font-semibold">
            {money(p.price_cents)}
            {p.compare_at_cents ? (
              <span className="text-xs font-normal text-muted-foreground line-through">
                {money(p.compare_at_cents)}
              </span>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">{p.page_count} pages</span>
        </div>
      </div>
    </Link>
  );
}
