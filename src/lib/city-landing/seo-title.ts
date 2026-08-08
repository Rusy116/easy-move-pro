// ---------------------------------------------------------------------------
// Deterministic SEO title generation for city pages.
//
// A long city name must NEVER block publishing. We walk a fallback ladder of
// progressively shorter templates and return the first one that fits the SEO
// title budget. The city name itself is never truncated unless the city name
// alone already exceeds the budget (which does not happen for US place names).
// ---------------------------------------------------------------------------

/** Google truncates around 60 chars; the publish gate allows up to 70. */
export const SEO_TITLE_MAX = 60;
export const SEO_TITLE_HARD_MAX = 70;
export const SEO_TITLE_MIN = 25;

type Template = (city: string, st: string) => string;

/** Ordered longest → shortest. The last entry always fits. */
const MOVERS_TITLE_TEMPLATES: Template[] = [
  (c, s) => `Licensed Moving Companies in ${c}, ${s} | Instant Quote`,
  (c, s) => `Licensed Movers in ${c}, ${s} | Instant Quote`,
  (c, s) => `Movers in ${c}, ${s} | Instant Moving Quote`,
  (c, s) => `Movers in ${c}, ${s} | Instant Quote`,
  (c, s) => `Movers in ${c}, ${s} | Free Quote`,
  (c, s) => `Movers in ${c}, ${s}`,
  (c, s) => `${c}, ${s} Movers`,
];

const CALCULATOR_TITLE_TEMPLATES: Template[] = [
  (c, s) => `Moving Cost Calculator ${c}, ${s} | Instant Estimate`,
  (c, s) => `Moving Calculator ${c}, ${s} | Instant Estimate`,
  (c, s) => `Moving Calculator ${c}, ${s} | Free Estimate`,
  (c, s) => `Moving Calculator ${c}, ${s}`,
  (c, s) => `${c}, ${s} Moving Calculator`,
];

function pick(templates: Template[], city: string, st: string): string {
  const cleanCity = city.trim().replace(/\s+/g, " ");
  const cleanSt = st.trim().toUpperCase();

  for (const t of templates) {
    const candidate = t(cleanCity, cleanSt);
    if (candidate.length <= SEO_TITLE_MAX) return candidate;
  }
  // Every template is long → accept the shortest one if it still clears the
  // hard gate, otherwise fall back to the bare city/state pair.
  const shortest = templates[templates.length - 1]!(cleanCity, cleanSt);
  if (shortest.length <= SEO_TITLE_HARD_MAX) return shortest;
  return `${cleanCity}, ${cleanSt}`.slice(0, SEO_TITLE_HARD_MAX);
}

/** Title for /movers/<city>-<st>. Always within the publish gate. */
export function buildMoversTitle(city: string, stateCode: string): string {
  return pick(MOVERS_TITLE_TEMPLATES, city, stateCode);
}

/** Title for /moving-calculator/<city>-<st>. Always within the publish gate. */
export function buildCalculatorTitle(city: string, stateCode: string): string {
  return pick(CALCULATOR_TITLE_TEMPLATES, city, stateCode);
}

/** True when a generated title is publishable. Validates the FINAL string. */
export function isPublishableTitle(title: string): boolean {
  const t = title.trim();
  return t.length >= SEO_TITLE_MIN && t.length <= SEO_TITLE_HARD_MAX && !/\|\s*$/.test(t);
}
