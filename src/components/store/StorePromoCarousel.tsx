import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { CoverImage } from "@/components/store/CoverImage";
import { money, type PdfProduct } from "@/lib/pdf-store/catalog";
import { cn } from "@/lib/utils";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

interface Slide {
  title: string;
  sub: string;
  note?: string;
  cta: string;
  to: string;
  params?: Record<string, string>;
  product?: PdfProduct;
}

/**
 * Premium promotional carousel for the digital store. Slides link to real
 * products and existing categories — no invented catalog data.
 */
export function StorePromoCarousel({ products }: { products: PdfProduct[] }) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();

  const paid = products.filter((p) => p.price_cents > 0);
  const cheapest = paid.length
    ? paid.reduce((a, b) => (b.price_cents < a.price_cents ? b : a))
    : undefined;
  const hero =
    products.find((p) => p.is_featured) ?? products.find((p) => p.is_bestseller) ?? products[0];
  const planner =
    products.find((p) => p.category_slug === "planners") ??
    products.find((p) => /planner|timeline/i.test(p.title));
  const checklist =
    products.find((p) => p.category_slug === "checklists") ??
    products.find((p) => /checklist/i.test(p.title));

  const slides: Slide[] = [
    {
      title: "Make Your Move Easier",
      sub: "Printable Moving Checklists & Planners",
      note: cheapest ? `From ${money(cheapest.price_cents)}` : undefined,
      cta: "Shop Now",
      to: hero ? "/products/$slug" : "/products",
      params: hero ? { slug: hero.slug } : undefined,
      product: hero,
    },
    {
      title: "Plan Your Move With Confidence",
      sub: "Moving planners, timelines and checklists",
      cta: "Shop Moving Planners",
      to: "/products/category/$slug",
      params: { slug: "planners" },
      product: planner,
    },
    {
      title: "Don't Forget a Thing",
      sub: "Printable moving checklists for every stage of your move",
      cta: "Shop Checklists",
      to: "/products/category/$slug",
      params: { slug: "checklists" },
      product: checklist,
    },
  ];

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || reduced || paused) return;
    const id = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 6000);
    return () => window.clearInterval(id);
  }, [api, reduced, paused]);

  return (
    <section
      aria-label="Store promotions"
      className="mx-auto max-w-6xl px-4 pt-6 sm:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <Carousel setApi={setApi} opts={{ loop: true, duration: reduced ? 0 : 28 }}>
          <CarouselContent>
            {slides.map((s) => (
              <CarouselItem key={s.title}>
                <div className="grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1.4fr_1fr]">
                  <div>
                    {s.note && (
                      <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
                        {s.note}
                      </span>
                    )}
                    <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">
                      {s.title}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{s.sub}</p>
                    <Link
                      to={s.to}
                      params={s.params as never}
                      className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      {s.cta}
                    </Link>
                  </div>
                  {s.product && (
                    <div className="mx-auto hidden w-40 overflow-hidden rounded-xl border border-border/60 shadow-lg sm:w-48 md:block">
                      <div className="aspect-[3/4]">
                        <CoverImage
                          slug={s.product.slug}
                          title={s.product.title}
                          coverUrl={s.product.cover_url}
                          spec={s.product.cover_spec}
                          alt={s.product.alt_text}
                          sizes="200px"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => api?.scrollPrev()}
            className="grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-background/80 transition hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={current === i}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  current === i ? "w-6 bg-primary" : "w-2 bg-border",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => api?.scrollNext()}
            className="grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-background/80 transition hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
