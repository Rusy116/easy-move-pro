// ---------------------------------------------------------------------------
// City page media resolution.
//
// A missing city image must NEVER block publication and must never crash a
// page. The hierarchy is: real city image → previously stored/generated image
// → safe generic moving fallback (bundled asset, resolved in the component).
// ---------------------------------------------------------------------------
import type { CityFacts } from "./data";

export type CityHeroSource = "city" | "generated" | "fallback";

export interface CityHero {
  /** Absolute/relative image URL, or null when the bundled fallback is used. */
  url: string | null;
  alt: string;
  source: CityHeroSource;
}

interface OptimizedImage {
  role?: string;
  filename?: string;
  alt?: string;
  schema?: { contentUrl?: string };
}

function isUsableUrl(v: unknown): v is string {
  return typeof v === "string" && /^(https?:\/\/|\/)\S+\.(jpe?g|png|webp|avif)$/i.test(v.trim());
}

export function heroAltFor(facts: Pick<CityFacts, "city" | "stateCode">): string {
  return `Professional movers loading a truck in ${facts.city}, ${facts.stateCode}`;
}

/**
 * Deterministic hero picker. Reuses an already-valid image instead of asking
 * for a new one, and always returns something renderable.
 */
export function resolveCityHero(
  media: unknown,
  facts: Pick<CityFacts, "city" | "stateCode">,
): CityHero {
  const m = (media ?? {}) as Record<string, unknown>;
  const alt = heroAltFor(facts);

  // 1 — a real city image already stored on the record.
  const existing = m["hero"] as { url?: unknown; alt?: unknown; source?: unknown } | undefined;
  if (existing && isUsableUrl(existing.url)) {
    return {
      url: existing.url,
      alt: typeof existing.alt === "string" && existing.alt ? existing.alt : alt,
      source: (existing.source as CityHeroSource) ?? "city",
    };
  }

  // 2 — an image produced earlier by the image pipeline.
  const optimized = Array.isArray(m["optimized"]) ? (m["optimized"] as OptimizedImage[]) : [];
  const generated =
    optimized.find((o) => o.role === "hero") ??
    optimized.find((o) => o.role === "skyline") ??
    optimized.find((o) => o.role === "featured");
  if (generated && isUsableUrl(generated.schema?.contentUrl)) {
    return { url: generated.schema!.contentUrl!, alt: generated.alt || alt, source: "generated" };
  }

  // 3 — safe generic moving fallback (bundled asset, resolved by the page).
  return { url: null, alt, source: "fallback" };
}
