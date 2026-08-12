// JSON-LD schema builders + head meta helpers.
//
// Canonical, og:url and every schema `url`/`item` MUST be absolute so search
// engines attribute the page to one host (no preview/production ambiguity).
export const SITE_ORIGIN = "https://easymove.pro";

/** "/movers/dallas-tx" → "https://easymove.pro/movers/dallas-tx" */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Easy Moving",
    url: SITE_ORIGIN,
    logo: absoluteUrl("/favicon.ico"),
    description:
      "AI-powered moving marketplace connecting customers with vetted moving companies across the United States.",
    sameAs: [] as string[],
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.url),
    })),
  };
}

export function faqSchema(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function serviceSchema(opts: { name: string; description: string; areaServed?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    provider: { "@type": "Organization", name: "Easy Moving", url: SITE_ORIGIN },
    ...(opts.areaServed ? { areaServed: opts.areaServed } : {}),
  };
}

export function localBusinessSchema(opts: {
  name: string;
  description: string;
  area: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MovingCompany",
    name: opts.name,
    description: opts.description,
    areaServed: opts.area,
    url: absoluteUrl(opts.url),
    provider: { "@type": "Organization", name: "Easy Moving", url: SITE_ORIGIN },
  };
}

// Convert JSON-LD object to a head() scripts entry
export function jsonLd(obj: unknown) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(obj),
  };
}

// Build a standard meta array for SEO pages
export function seoMeta(opts: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
  /** Set false to keep the page out of the index (still crawlable/followable). */
  index?: boolean;
}) {
  const url = absoluteUrl(opts.path);
  const meta: Array<Record<string, string>> = [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: opts.type ?? "website" },
    { property: "og:url", content: url },
    { name: "twitter:card", content: opts.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
  ];
  if (opts.image) {
    meta.push({ property: "og:image", content: absoluteUrl(opts.image) });
    meta.push({ name: "twitter:image", content: absoluteUrl(opts.image) });
  }
  if (opts.index === false) meta.push({ name: "robots", content: "noindex, follow" });
  return meta;
}

/** Self-referencing canonical link entry for a route's head().links. */
export function canonical(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) };
}

/** WebSite + SearchAction (sitelinks search box). */
export function websiteSchema(origin = SITE_ORIGIN) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Easy Moving",
    url: origin,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
