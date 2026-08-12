import { useState } from "react";
import fallbackHero from "@/assets/city-hero-fallback.jpg";
import type { CityHero } from "@/lib/city-landing/media";

/**
 * City hero image with a guaranteed visual. A missing or broken city photo
 * degrades to a branded moving illustration — the layout never collapses and
 * the page never ships an empty <img>.
 */
export function CityHeroImage({
  hero,
  city,
  stateCode,
  className = "",
  priority = false,
}: {
  hero?: CityHero | null;
  city: string;
  stateCode: string;
  className?: string;
  /** Set on the page's LCP image so the browser fetches it immediately. */
  priority?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const src = !hero?.url || broken ? fallbackHero : hero.url;
  const alt =
    hero?.alt ?? `Professional movers loading a truck in ${city}, ${stateCode}`;

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-muted ${className}`}>
      <img
        src={src}
        alt={alt}
        width={1200}
        height={630}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onError={() => setBroken(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
