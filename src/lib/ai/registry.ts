/**
 * AI Growth Center — static registry.
 *
 * Everything the UI needs to know about agents and their capabilities lives
 * here. Adding a new agent or capability is a data change only: no component
 * needs to be touched, no route needs to be created.
 */

export type AiCapability = {
  /** stable key stored on ai_tasks.capability */
  key: string;
  label: string;
  description: string;
  /** which agent executes the task when a worker picks it up */
  agentKey: string;
};

export type AiModuleKey =
  | "seo"
  | "products"
  | "content"
  | "publishing"
  | "analytics"
  | "automation";

export const AI_STATUS_TONE: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  online: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  running: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  queued: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  paused: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  scheduled: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  publishing: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  review: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  published: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
  stopped: "bg-muted text-muted-foreground",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  error: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function caps(agentKey: string, items: [string, string, string][]): AiCapability[] {
  return items.map(([key, label, description]) => ({ key, label, description, agentKey }));
}

export const SEO_CAPABILITIES = caps("seo_factory", [
  ["seo.city_pages", "Generate City Pages", "Localized moving pages per city with local proof."],
  ["seo.route_pages", "Generate Route Pages", "City-to-city corridor pages with distance data."],
  ["seo.service_pages", "Generate Service Pages", "Packing, storage, long distance, piano moves."],
  ["seo.blog_articles", "Generate Blog Articles", "Keyword-targeted long-form articles."],
  ["seo.faq_pages", "Generate FAQ Pages", "Structured Q&A clusters with FAQ schema."],
  ["seo.category_pages", "Generate Category Pages", "Topic hubs that group related pages."],
  ["seo.collection_pages", "Generate Collection Pages", "Curated collections for discovery."],
  ["seo.internal_links", "Generate Internal Links", "Contextual link mesh across the site."],
  ["seo.schema", "Generate Schema", "JSON-LD for service, FAQ, breadcrumb, product."],
  ["seo.audit", "SEO Audit", "Crawl published pages and score technical health."],
  ["seo.duplicates", "Duplicate Detection", "Flag near-duplicate pages and cannibalization."],
  ["seo.refresh", "Content Refresh", "Rewrite and re-date stale pages."],
]);

export const PRODUCT_CAPABILITIES = caps("product_factory", [
  ["product.ideas", "Idea Generator", "Mine demand signals for new product ideas."],
  ["product.build", "Product Generator", "Build a full product from an approved idea."],
  ["product.pdf", "PDF Generator", "Print-ready PDF guides and packets."],
  ["product.excel", "Excel Generator", "Budget and inventory spreadsheets."],
  ["product.checklist", "Checklist Generator", "Step-by-step moving checklists."],
  ["product.planner", "Planner Generator", "Week-by-week moving planners."],
  ["product.template", "Template Generator", "Reusable document templates."],
  ["product.workbook", "Workbook Generator", "Interactive workbooks and worksheets."],
  ["product.cover", "Cover Generator", "Cover artwork for each product."],
  ["product.previews", "Preview Images", "Store preview mockups."],
  ["product.description", "Description Generator", "Conversion-focused product copy."],
  ["product.seo", "SEO Generator", "Titles, meta and keywords for store pages."],
  ["product.schema", "Schema Product", "Product JSON-LD with offers and ratings."],
  ["product.pricing", "Pricing Assistant", "Suggest price points from performance data."],
  ["product.bundle", "Bundle Generator", "Group products into higher-value bundles."],
  ["product.related", "Related Products", "Cross-sell recommendations."],
  ["product.refresh", "Product Refresh", "Update dated products and assets."],
]);

export const CONTENT_CAPABILITIES = caps("content_factory", [
  ["content.article", "Generate Articles", "Editorial articles for the blog."],
  ["content.guide", "Moving Guides", "Comprehensive step-by-step guides."],
  ["content.checklist", "Checklists", "Actionable checklists for each move stage."],
  ["content.faq", "FAQ", "Question clusters answered concisely."],
  ["content.howto", "How-To Articles", "Task-oriented how-to content."],
  ["content.local", "Local Guides", "Neighborhood and city living guides."],
  ["content.comparison", "Comparison Pages", "Head-to-head option comparisons."],
  ["content.buying", "Buying Guides", "What to look for before buying or booking."],
  ["content.resource", "Resource Pages", "Curated resource collections."],
  ["content.calendar", "Content Calendar", "Plan a publishing calendar for the period."],
]);

export const ALL_CAPABILITIES = [
  ...SEO_CAPABILITIES,
  ...PRODUCT_CAPABILITIES,
  ...CONTENT_CAPABILITIES,
];

/** Publishing pipeline stages, in order. */
export const PUBLISH_STAGES = [
  "draft",
  "review",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "archived",
] as const;
export type PublishStage = (typeof PUBLISH_STAGES)[number];

export const AUTOMATION_PRESETS = [
  {
    name: "Generate 20 SEO pages every day",
    capability: "seo.city_pages",
    frequency: "daily",
    quantity: 20,
  },
  {
    name: "Generate 5 products every week",
    capability: "product.build",
    frequency: "weekly",
    quantity: 5,
  },
  {
    name: "Refresh articles older than 6 months",
    capability: "seo.refresh",
    frequency: "monthly",
    quantity: 10,
  },
  { name: "Generate FAQ every Friday", capability: "content.faq", frequency: "weekly", quantity: 3 },
  {
    name: "Publish approved content automatically",
    capability: "seo.schema",
    frequency: "hourly",
    quantity: 1,
  },
  { name: "Run SEO Audit every Sunday", capability: "seo.audit", frequency: "weekly", quantity: 1 },
] as const;
