import { Link } from "@tanstack/react-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CoverImage } from "@/components/store/CoverImage";
import { Badge } from "@/components/ui/badge";
import { money, type PdfProduct } from "@/lib/pdf-store/catalog";

/** Ranks the existing catalog by the fields the database already has. */
export function popularProducts(all: PdfProduct[], limit = 12) {
  return [...all]
    .sort((a, b) => {
      const score = (p: PdfProduct) =>
        (p.is_bestseller ? 1000 : 0) + (p.is_featured ? 500 : 0) + Number(p.downloads ?? 0) + Number(p.views ?? 0) / 10;
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return String(b.published_at ?? "").localeCompare(String(a.published_at ?? ""));
    })
    .slice(0, limit);
}

/** Horizontal, swipeable carousel of the store's most relevant products. */
export function PopularProducts({ products }: { products: PdfProduct[] }) {
  const items = popularProducts(products);
  if (!items.length) return null;

  return (
    <section id="popular-products" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:px-6">
      <h2 className="font-serif text-2xl sm:text-3xl">Popular Moving Products</h2>
      <p className="mt-1 text-sm text-muted-foreground">Practical printable tools for a smoother move.</p>

      <Carousel opts={{ align: "start", dragFree: true }} className="mt-6">
        <CarouselContent className="-ml-4">
          {items.map((p) => (
            <CarouselItem key={p.slug} className="basis-[78%] pl-4 sm:basis-1/2 lg:basis-1/4">
              <Link
                to="/products/$slug"
                params={{ slug: p.slug }}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:shadow-lg"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <CoverImage
                    slug={p.slug}
                    title={p.title}
                    coverUrl={p.cover_url}
                    spec={p.cover_spec}
                    alt={p.alt_text}
                    className="transition duration-300 group-hover:scale-[1.03]"
                  />
                  {p.is_bestseller && <Badge className="absolute left-3 top-3 rounded-full">Bestseller</Badge>}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <h3 className="font-serif text-base leading-tight">{p.title}</h3>
                  {p.subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{p.subtitle}</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-sm font-semibold">{money(p.price_cents)}</span>
                    <span className="rounded-full border border-border/70 px-3 py-1 text-xs transition group-hover:bg-muted">
                      View Product
                    </span>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </section>
  );
}
