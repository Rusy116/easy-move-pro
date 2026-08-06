// ---------------------------------------------------------------------------
// EASY MOVE PRO — AI ECOSYSTEM MAP
//
// Single source of truth describing the 12 coordinated agents and the strict
// production pipeline they follow. Pure data: no I/O, no side effects, safe to
// import from server functions and from the browser.
//
// Nothing here touches CRM, marketplace, broker, customer or quote logic.
// ---------------------------------------------------------------------------

export type AgentRuntime = "live" | "queued";

export interface EcosystemAgent {
  /** matches ai_agents.key */
  key: string;
  /** AGENT N in the specification */
  index: number;
  name: string;
  purpose: string;
  /** agent keys that must run before this one */
  dependsOn: string[];
  runtime: AgentRuntime;
  /** admin dashboard that controls this agent */
  route: string;
  queue: string;
  priority: number;
  capabilities: string[];
}

export const ECOSYSTEM_AGENTS: EcosystemAgent[] = [
  {
    key: "usa_data_engine",
    index: 1,
    name: "USA Data Engine",
    purpose:
      "Maintains the master USA dataset: states, counties, cities, ZIP codes, neighborhoods, highways, airports, coordinates, population, demand score and SEO priority.",
    dependsOn: [],
    runtime: "live",
    route: "/ai/usa-data",
    queue: "usa_data",
    priority: 1,
    capabilities: ["Import 10 / 100 / 1k / 10k / entire USA", "Duplicate detection", "Resume interrupted imports"],
  },
  {
    key: "city_landing_agent",
    index: 2,
    name: "City Calculator Factory",
    purpose:
      "ALWAYS runs first. Import city → generate calculator → validate → publish. Exactly one calculator per city at /moving-calculator/{city}-{st}. Never duplicated.",
    dependsOn: ["usa_data_engine"],
    runtime: "live",
    route: "/ai/cities",
    queue: "city_landing",
    priority: 2,
    capabilities: ["Calculator-first pipeline", "22-point validation", "Auto-publish gate"],
  },
  {
    key: "seo_landing_factory",
    index: 3,
    name: "SEO Landing Factory",
    purpose:
      "Runs only after the calculator is published. Builds the localized /movers/{city}-{st} service page that embeds the one official calculator.",
    dependsOn: ["city_landing_agent"],
    runtime: "live",
    route: "/ai/city-review",
    queue: "city_landing",
    priority: 3,
    capabilities: ["Localized service page", "Embeds existing calculator", "Never clones the calculator"],
  },
  {
    key: "internal_linking_engine",
    index: 4,
    name: "Internal Linking Engine",
    purpose:
      "Builds the hierarchical link mesh: neighborhood → small → medium → large → metro → county → state → USA hub. Guarantees zero orphan pages.",
    dependsOn: ["seo_landing_factory"],
    runtime: "live",
    route: "/ai/city-factory",
    queue: "city_landing",
    priority: 4,
    capabilities: ["Upward + downward links", "Lateral peer cities", "County & state hubs"],
  },
  {
    key: "seo_content_engine",
    index: 5,
    name: "SEO Content Engine",
    purpose:
      "Generates unique localized content per city: FAQ, neighborhoods, parking, regulations, weather, schools, landmarks, moving tips and ZIP data.",
    dependsOn: ["usa_data_engine"],
    runtime: "live",
    route: "/ai/seo",
    queue: "content",
    priority: 4,
    capabilities: ["Unique per-city copy", "FAQ clusters", "JSON-LD schema"],
  },
  {
    key: "blog_agent",
    index: 6,
    name: "Blog Agent",
    purpose:
      "Writes SEO articles for moving customers. Every article links naturally to the calculator, city pages, service pages and digital products.",
    dependsOn: ["seo_content_engine"],
    runtime: "live",
    route: "/ai/ecosystem",
    queue: "content",
    priority: 5,
    capabilities: ["Customer-intent articles", "Automatic internal links", "Draft → Publishing Center"],
  },
  {
    key: "mover_growth_agent",
    index: 7,
    name: "Moving Company Growth Agent",
    purpose:
      "Writes SEO articles targeting moving companies (leads, marketing, CRM, Google Business, lead generation). Every article promotes marketplace registration.",
    dependsOn: ["seo_content_engine"],
    runtime: "live",
    route: "/ai/ecosystem",
    queue: "content",
    priority: 5,
    capabilities: ["B2B topics", "Marketplace CTA on every article", "Partner funnel links"],
  },
  {
    key: "product_factory",
    index: 8,
    name: "Digital Product Agent",
    purpose:
      "Creates checklists, planners, templates, inventory sheets, labels and guides. Each product gets a landing page, SEO, images, download page and internal links.",
    dependsOn: ["seo_content_engine"],
    runtime: "live",
    route: "/ai/products",
    queue: "products",
    priority: 6,
    capabilities: ["Product generation", "Store SEO", "Cover + preview briefs"],
  },
  {
    key: "image_factory",
    index: 9,
    name: "Image Agent",
    purpose:
      "Produces featured images, social images, infographics, OpenGraph images, Pinterest graphics and product covers for every published asset.",
    dependsOn: ["blog_agent", "product_factory"],
    runtime: "live",
    route: "/ai/ecosystem",
    queue: "media",
    priority: 6,
    capabilities: ["OG 1200×630", "Pinterest 1000×1500", "Product covers"],
  },
  {
    key: "self_optimization_agent",
    index: 10,
    name: "Self Optimization Agent",
    purpose:
      "Monitors search performance and automatically improves title, meta, FAQ, internal links, content and CTR of underperforming pages, then republishes.",
    dependsOn: ["internal_linking_engine"],
    runtime: "live",
    route: "/ai/city-factory",
    queue: "city_landing",
    priority: 7,
    capabilities: ["Audit ≥ 95 gate", "Degraded page detection", "Auto regenerate + republish"],
  },
  {
    key: "google_performance_agent",
    index: 11,
    name: "Google Performance Agent",
    purpose:
      "Tracks Search Console and GA4 signals: rankings, CTR, impressions, clicks, Core Web Vitals and attributed revenue.",
    dependsOn: ["seo_landing_factory"],
    runtime: "live",
    route: "/ai/city-index",
    queue: "analytics",
    priority: 7,
    capabilities: ["Index status", "CTR & position deltas", "Daily metric rollups"],
  },
  {
    key: "revenue_agent",
    index: 12,
    name: "Revenue Agent",
    purpose:
      "Tracks marketplace revenue, broker revenue, digital products, affiliate income, lead sales, MRR and LTV — read-only over existing finance tables.",
    dependsOn: ["google_performance_agent"],
    runtime: "live",
    route: "/ai/ecosystem",
    queue: "analytics",
    priority: 8,
    capabilities: ["Read-only finance rollup", "MRR / LTV", "Product + commission revenue"],
  },
];

/** The strict production order. The calculator step can never move. */
export const PRODUCTION_PIPELINE = [
  "Import City",
  "Validate",
  "Generate Calculator",
  "Publish Calculator",
  "Generate SEO Pages",
  "Generate Local Content",
  "Generate FAQ",
  "Generate Schema",
  "Generate Internal Links",
  "Generate Images",
  "Update Sitemap",
  "Publish",
  "Request Google Indexing",
  "Monitor Rankings",
  "Improve Forever",
] as const;

export function agentByKey(key: string) {
  return ECOSYSTEM_AGENTS.find((a) => a.key === key);
}
