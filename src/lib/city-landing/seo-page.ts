// ---------------------------------------------------------------------------
// Production pipeline — Stage 2: the SEO landing page (/movers/<city>-<st>).
//
// Stage 1 (the calculator page at /moving-calculator/<city>-<st>) must be
// published first. This module only builds the SEO layer around the SAME
// calculator component — it never clones calculator logic.
// ---------------------------------------------------------------------------
import type { CityFacts } from "./data";
import { moversPathFor, landingPathFor } from "./data";
import type { CityLandingContent, CityFaqItem, CitySection } from "./content";
import { SITE_ORIGIN } from "./validation";
import { buildMoversTitle, isPublishableTitle } from "./seo-title";


export interface MoversSeoContent {
  title: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  sections: CitySection[];
  faq: CityFaqItem[];
  keywords: string[];
  internalLinks: Array<{ label: string; to: string }>;
  calculatorPath: string;
  canonicalUrl: string;
  wordCount: number;
}

function words(...parts: string[]): number {
  return parts.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

/** Deterministic SEO page derived from the published calculator page content. */
export function buildMoversSeoContent(
  f: CityFacts,
  content: CityLandingContent,
): MoversSeoContent {
  const path = moversPathFor(f.slug, f.stateCode);
  const calculatorPath = landingPathFor(f.slug, f.stateCode);

  const intro = [
    `Looking for movers in ${f.city}, ${f.stateCode}? Easy Moving matches your move with one licensed, insured ${f.city} moving company — and prices it instantly with the same calculator our brokers use.`,
    ...content.intro.slice(0, 2),
  ];

  const sections: CitySection[] = [
    {
      h2: `Moving companies in ${f.city}, ${f.stateName}`,
      paragraphs: [
        `Every ${f.city} partner on Easy Moving holds active DOT/MC registration plus cargo and liability coverage, re-verified at renewal. You are matched with one company — never blasted to a shared lead list.`,
        `Coverage spans ${f.neighborhoods.slice(0, 6).join(", ")}${f.county ? ` and the wider ${f.county}` : ""}, with crews staged along ${f.highways.slice(0, 3).join(", ") || "the main regional corridors"}.`,
      ],
    },
    ...content.sections,
    {
      h2: `What movers cost in ${f.city}`,
      paragraphs: [
        `Typical local moves in ${f.city} run about $${f.averages.studio.toLocaleString()} for a studio, $${f.averages.twoBed.toLocaleString()} for a two-bedroom and $${f.averages.house.toLocaleString()} for a three-bedroom house, with hourly crews around $${f.averages.hourly}/hr.`,
        `Use the calculator on this page for a real, itemized range based on your inventory, floor, elevator access, packing and move date instead of a generic average.`,
      ],
    },
  ];

  const internalLinks = [
    { label: `${f.city} moving calculator`, to: calculatorPath },
    { label: "All moving calculators", to: "/calculator" },
    { label: `Moving services in ${f.stateName}`, to: `/states/${f.stateSlug}` },
    { label: "Our moving services", to: "/services" },
    ...f.nearbyCities.slice(0, 6).map((n) => ({
      label: `Movers in ${n.name}, ${n.state}`,
      to: moversPathFor(n.slug, n.state),
    })),
  ];

  const wordCount = words(
    ...intro,
    ...sections.flatMap((s) => [s.h2, ...s.paragraphs, ...(s.subsections ?? []).map((x) => `${x.h3} ${x.body}`)]),
    ...content.faq.flatMap((q) => [q.q, q.a]),
  );

  return {
    title: buildMoversTitle(f.city, f.stateCode),
    metaDescription: `Compare licensed movers in ${f.city}, ${f.stateCode}. Get an instant, itemized moving quote in under 60 seconds — no spam calls, one verified local moving company.`.slice(0, 175),
    h1: `Movers in ${f.city}, ${f.stateCode}`,
    intro,
    sections,
    faq: content.faq,
    keywords: [`movers ${f.city}`, `moving companies ${f.city}`, `${f.city} ${f.stateCode} movers`, ...content.keywords].slice(0, 14),
    internalLinks,
    calculatorPath,
    canonicalUrl: `${SITE_ORIGIN}${path}`,
    wordCount,
  };
}

export interface SeoPageValidation {
  ok: boolean;
  blockers: string[];
  wordCount: number;
  internalLinks: number;
  canonicalUrl: string;
}

/** Quality gate for stage 2. Blocks publishing a thin or broken SEO page. */
export function validateMoversSeoContent(seo: MoversSeoContent): SeoPageValidation {
  const blockers: string[] = [];
  if (!seo.h1) blockers.push("Missing H1");
  // Validate the FINAL generated title. buildMoversTitle() already shortens
  // the template for long city names, so this can only fail on real defects.
  if (!isPublishableTitle(seo.title)) blockers.push("SEO title length out of range");

  if (seo.metaDescription.length < 110) blockers.push("Meta description too short");
  if (seo.faq.length < 5) blockers.push("Fewer than 5 FAQ entries");
  if (seo.internalLinks.length < 4) blockers.push("Fewer than 4 internal links");
  if (!seo.calculatorPath) blockers.push("Calculator not linked/embedded");
  if (seo.wordCount < 1200) blockers.push(`Thin content (${seo.wordCount} words)`);
  return {
    ok: blockers.length === 0,
    blockers,
    wordCount: seo.wordCount,
    internalLinks: seo.internalLinks.length,
    canonicalUrl: seo.canonicalUrl,
  };
}
