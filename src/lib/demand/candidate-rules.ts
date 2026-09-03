// ---------------------------------------------------------------------------
// DD-4 — Deterministic rules that turn REAL Google Search Console observations
// into REVIEW-ONLY product opportunity candidates.
//
// No AI. No external calls. No inferred market metrics.
// GSC impressions describe how often easymove.pro was SHOWN in Google results
// for a query. They are NOT search volume, monthly searches, or market size.
// ---------------------------------------------------------------------------

export type GscSignal = {
  id: string;
  query: string;
  query_norm: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  avg_position: number | null;
  window_start: string;
  window_end: string;
};

export type ProductFit =
  | "moving_checklist"
  | "packing_checklist"
  | "moving_budget"
  | "home_inventory"
  | "moving_cost_planner"
  | "utility_transfer"
  | "address_change"
  | "moving_timeline"
  | "moving_labels"
  | "apartment_move_planner"
  | "general_moving_planner";

export type Evaluation =
  | { accepted: false; query: string; reason: string }
  | {
      accepted: true;
      query: string;
      queryNorm: string;
      signalId: string;
      productFit: ProductFit;
      score: number;
      confidence: number;
      components: Record<string, number>;
      impressions: number;
      clicks: number;
      ctr: number;
      avgPosition: number;
    };

/**
 * DD-4B — Strong informational / product-intent modifiers.
 * A query that otherwise reads as "find me a moving service" may only stay
 * eligible when one of these appears.
 */
const STRONG_MODIFIERS: string[] = [
  "cost",
  "costs",
  "price",
  "prices",
  "pricing",
  "estimate",
  "estimates",
  "calculator",
  "budget",
  "checklist",
  "check list",
  "template",
  "planner",
  "planning",
  "worksheet",
  "inventory",
  "timeline",
  "guide",
  "how much",
  "how to",
  "what does",
  "average cost",
  "labels",
  "label",
  "packing list",
  "pack list",
  "schedule",
  "list",
];

const STRONG_MODIFIER_RES = STRONG_MODIFIERS.map(
  (t) => new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`),
);

export function hasStrongModifier(norm: string): boolean {
  return STRONG_MODIFIER_RES.some((re) => re.test(norm));
}

/**
 * DD-4B — Service-seeking nouns. "mover"/"movers"/"moving company" and their
 * variations mean "hire someone", not "give me a planning resource", unless a
 * strong informational modifier is present.
 */
const SERVICE_INTENT_PATTERNS: RegExp[] = [
  /(^|[^a-z])movers?([^a-z]|$)/,
  /(^|[^a-z])moving compan(y|ies)([^a-z]|$)/,
  /(^|[^a-z])moving (service|services|crew|crews|help|helpers|labor)([^a-z]|$)/,
  /(^|[^a-z])(relocation|removal) (service|services|compan(y|ies))([^a-z]|$)/,
  /(^|[^a-z])moving (truck|van) rental([^a-z]|$)/,
];

export function hasServiceIntent(norm: string): boolean {
  return SERVICE_INTENT_PATTERNS.some((re) => re.test(norm));
}

/** Product-intent vocabulary. Ordered — first match wins. */
const FIT_RULES: Array<{ fit: ProductFit; weight: number; tokens: string[] }> = [
  { fit: "address_change", weight: 24, tokens: ["address change", "change of address", "change address"] },
  { fit: "utility_transfer", weight: 24, tokens: ["utilities", "utility transfer", "transfer utilities"] },
  { fit: "packing_checklist", weight: 25, tokens: ["packing", "pack list", "box list"] },
  { fit: "moving_checklist", weight: 25, tokens: ["checklist", "check list"] },
  { fit: "home_inventory", weight: 25, tokens: ["inventory"] },
  { fit: "moving_budget", weight: 25, tokens: ["budget"] },
  {
    fit: "moving_cost_planner",
    weight: 22,
    tokens: [
      "cost",
      "costs",
      "price",
      "prices",
      "pricing",
      "rates",
      "estimate",
      "calculator",
      "how much",
      "average cost",
    ],
  },
  { fit: "moving_timeline", weight: 23, tokens: ["timeline", "schedule", "weeks before"] },
  { fit: "moving_labels", weight: 20, tokens: ["label", "labels"] },
  {
    fit: "general_moving_planner",
    weight: 18,
    tokens: ["planner", "template", "worksheet", "organizer", "organization", "preparation", "prepare", "guide"],
  },
];

/** Apartment/condo context — never enough on its own (DD-4B rule 4). */
const APARTMENT_CONTEXT = /(^|[^a-z])(apartment|studio|condo)([^a-z]|$)/;
/** Explicit planning/informational intent required alongside apartment context. */
const APARTMENT_PLANNING_INTENT = [
  "checklist",
  "check list",
  "planner",
  "planning",
  "guide",
  "timeline",
  "list",
  "template",
  "how to",
  "worksheet",
  "schedule",
  "inventory",
].map((t) => new RegExp(`(^|[^a-z])${t}([^a-z]|$)`));

/** Words that look like product intent and must never be treated as a place name. */
const PRODUCT_TOKEN_GUARD = new Set(
  FIT_RULES.flatMap((r) => r.tokens.flatMap((t) => t.split(" ")))
    .concat(STRONG_MODIFIERS.flatMap((t) => t.split(" ")))
    .concat([
      "moving",
      "movers",
      "mover",
      "move",
      "moves",
      "home",
      "house",
      "apartment",
      "storage",
      "office",
      "quote",
      "quotes",
    ]),
);

/** Always-reject navigational patterns (brand / contact / "near me"). */
const HARD_NAVIGATIONAL_PATTERNS: RegExp[] = [
  /\bnear me\b/,
  /\b\d+ men and a truck\b/,
  /\btwo men and a truck\b/,
  /\bu-?haul\b/,
  /\bpods\b/,
  /\bpenske\b/,
  /\bbudget truck\b/,
  /\bhire\b|\bbook\b|\bphone\b|\bnumber\b|\breviews?\b/,
];

/** Provider-shopping wording — bypassed only when a strong modifier is present. */
const SOFT_NAVIGATIONAL_PATTERNS: RegExp[] = [
  /\bcompany\b|\bcompanies\b|\bservice\b|\bservices\b|\bhelpers\b/,
  /\bcheap\b|\baffordable\b|\bbest\b|\btop\b|\blocal\b|\bprofessional\b|\bresidential\b|\bcommercial\b|\bpiano\b|\bsame day\b/,
];

const NOISE_PATTERNS: RegExp[] = [/^[^a-z0-9]/, /["'“”]/, /\$/, /\b\d{3,}\b/, /^.{0,4}$/, /^.{80,}$/];


const STATE_NAMES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia",
  "hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts",
  "michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new hampshire","new jersey",
  "new mexico","new york","north carolina","north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island",
  "south carolina","south dakota","tennessee","texas","utah","vermont","virginia","washington","west virginia",
  "wisconsin","wyoming",
];

const STATE_CODES = [
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks","ky","la","me","md","ma","mi",
  "mn","ms","mo","mt","ne","nv","nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut",
  "vt","va","wa","wv","wi","wy","dc",
];

export function normalizeQuery(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

function hasGeo(norm: string, cityNames: Set<string>): boolean {
  const words = norm.split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    if (PRODUCT_TOKEN_GUARD.has(w)) continue;
    if (STATE_CODES.includes(w) && words.length > 1) return true;
    if (cityNames.has(w)) return true;
  }
  for (const s of STATE_NAMES) if (norm.includes(s)) return true;
  // multi-word city names ("prince frederick", "long beach", ...)
  for (let i = 0; i < words.length - 1; i++) {
    if (cityNames.has(`${words[i]} ${words[i + 1]}`)) return true;
  }
  return false;
}

function classify(norm: string): { fit: ProductFit; weight: number } | null {
  const apartmentPlanner =
    APARTMENT_CONTEXT.test(norm) && APARTMENT_PLANNING_INTENT.some((re) => re.test(norm));
  for (const rule of FIT_RULES) {
    // apartment_move_planner outranks the generic planner bucket, but specific
    // fits (checklist, cost, inventory, ...) still win first.
    if (apartmentPlanner && rule.fit === "general_moving_planner") {
      return { fit: "apartment_move_planner", weight: 20 };
    }
    for (const t of rule.tokens) {
      const re = new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
      if (re.test(norm)) return { fit: rule.fit, weight: rule.weight };
    }
  }
  // apartment_move_planner requires BOTH apartment context AND explicit
  // planning/informational intent — "apartment mover" alone never qualifies.
  if (apartmentPlanner) {
    return { fit: "apartment_move_planner", weight: 20 };
  }
  return null;
}


function impressionsPoints(impressions: number): number {
  // Log scaled, capped at 35. 30+ impressions in the window reaches the cap.
  return Math.min(35, Math.round((35 * Math.log(1 + impressions)) / Math.log(1 + 30)));
}

function rankingPoints(position: number): number {
  if (position <= 10) return 8; // already ranking well, less headroom
  if (position <= 20) return 25;
  if (position <= 40) return 20;
  if (position <= 60) return 12;
  return 5;
}

function ctrPoints(impressions: number, ctr: number): number {
  if (impressions >= 5 && ctr < 0.01) return 15;
  if (impressions >= 2 && ctr < 0.02) return 10;
  if (ctr < 0.05) return 6;
  return 3;
}

export function evaluateSignal(signal: GscSignal, cityNames: Set<string>): Evaluation {
  const norm = normalizeQuery(signal.query_norm ?? signal.query);

  if (NOISE_PATTERNS.some((re) => re.test(norm))) {
    return { accepted: false, query: signal.query, reason: "noise_or_malformed" };
  }
  const strong = hasStrongModifier(norm);
  for (const re of HARD_NAVIGATIONAL_PATTERNS) {
    if (re.test(norm)) return { accepted: false, query: signal.query, reason: "navigational_provider_intent" };
  }
  if (!strong) {
    for (const re of SOFT_NAVIGATIONAL_PATTERNS) {
      if (re.test(norm)) return { accepted: false, query: signal.query, reason: "navigational_provider_intent" };
    }
    if (hasServiceIntent(norm)) {
      return { accepted: false, query: signal.query, reason: "service_intent" };
    }
  }
  if (hasGeo(norm, cityNames)) {
    return { accepted: false, query: signal.query, reason: "narrow_local_intent" };
  }

  const fit = classify(norm);
  if (!fit) return { accepted: false, query: signal.query, reason: "no_defensible_product_fit" };


  const impressions = signal.impressions ?? 0;
  const clicks = signal.clicks ?? 0;
  const ctr = signal.ctr ?? 0;
  const avgPosition = signal.avg_position ?? 100;

  const components = {
    impressions_signal: impressionsPoints(impressions),
    ranking_opportunity: rankingPoints(avgPosition),
    click_opportunity: ctrPoints(impressions, ctr),
    product_fit_intent: fit.weight,
  };
  const score = Math.min(
    100,
    components.impressions_signal +
      components.ranking_opportunity +
      components.click_opportunity +
      components.product_fit_intent,
  );

  const confidence = Math.round(Math.min(0.95, 0.25 + (components.impressions_signal / 35) * 0.4 + (fit.weight / 25) * 0.3) * 100) / 100;

  return {
    accepted: true,
    query: signal.query,
    queryNorm: norm,
    signalId: signal.id,
    productFit: fit.fit,
    score,
    confidence,
    components,
    impressions,
    clicks,
    ctr,
    avgPosition,
  };
}

const FIT_TITLES: Record<ProductFit, string> = {
  moving_checklist: "Complete Moving Checklist",
  packing_checklist: "Room-by-Room Packing Checklist",
  moving_budget: "Moving Budget Worksheet",
  home_inventory: "Home Inventory Sheet",
  moving_cost_planner: "Moving Cost Planner",
  utility_transfer: "Utility Transfer Tracker",
  address_change: "Change of Address Checklist",
  moving_timeline: "8-Week Moving Timeline",
  moving_labels: "Printable Moving Box Labels",
  apartment_move_planner: "Apartment Move Planner",
  general_moving_planner: "Moving Planner Workbook",
};

const FIT_CATEGORY: Record<ProductFit, string> = {
  moving_checklist: "checklists",
  packing_checklist: "checklists",
  moving_budget: "budgets",
  home_inventory: "inventories",
  moving_cost_planner: "budgets",
  utility_transfer: "checklists",
  address_change: "checklists",
  moving_timeline: "planners",
  moving_labels: "labels",
  apartment_move_planner: "planners",
  general_moving_planner: "planners",
};

export function titleFor(fit: ProductFit): string {
  return FIT_TITLES[fit];
}

export function categoryFor(fit: ProductFit): string {
  return FIT_CATEGORY[fit];
}
