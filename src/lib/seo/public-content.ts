// Phase 7 — public content taxonomies: resources, AI tools, store + blog categories.
// Data only. AI functionality stays behind the "ai-assistant" feature flag.

export interface ResourceItem {
  slug: string;
  title: string;
  kind: "guide" | "checklist" | "video" | "download" | "faq" | "tip";
  description: string;
  minutes?: number;
}

export const RESOURCES: ResourceItem[] = [
  {
    slug: "8-week-moving-timeline",
    title: "The 8-week moving timeline",
    kind: "guide",
    minutes: 9,
    description:
      "Week-by-week plan from the day you decide to move to the day you unpack the last box.",
  },
  {
    slug: "moving-day-checklist",
    title: "Moving day checklist",
    kind: "checklist",
    minutes: 4,
    description: "Everything to confirm the night before and the morning of your move.",
  },
  {
    slug: "packing-room-by-room",
    title: "Packing room by room",
    kind: "guide",
    minutes: 12,
    description:
      "How professionals pack a kitchen, closet, garage and home office without breakage.",
  },
  {
    slug: "moving-budget-worksheet",
    title: "Moving budget worksheet",
    kind: "download",
    description: "A spreadsheet that captures movers, supplies, deposits, travel and hidden fees.",
  },
  {
    slug: "inventory-sheet",
    title: "Household inventory sheet",
    kind: "download",
    description: "Printable inventory for valuation coverage and delivery verification.",
  },
  {
    slug: "how-to-load-a-truck",
    title: "How to load a truck",
    kind: "video",
    minutes: 7,
    description: "Weight distribution, tiering and strapping demonstrated by a lead loader.",
  },
  {
    slug: "interstate-moving-rules",
    title: "Interstate moving rules explained",
    kind: "guide",
    minutes: 10,
    description: "DOT numbers, binding estimates, delivery spreads and your rights as a shipper.",
  },
  {
    slug: "storage-options",
    title: "Choosing storage that fits your move",
    kind: "guide",
    minutes: 6,
    description: "Storage-in-transit vs self storage vs container storage, with real cost ranges.",
  },
  {
    slug: "moving-with-kids",
    title: "Moving with kids and pets",
    kind: "tip",
    minutes: 5,
    description: "Keeping moving day calm for the smallest members of the household.",
  },
  {
    slug: "avoid-moving-scams",
    title: "How to avoid moving scams",
    kind: "faq",
    minutes: 6,
    description: "Red flags, deposit rules and how to verify a carrier before you sign.",
  },
  {
    slug: "office-move-playbook",
    title: "Office move playbook",
    kind: "guide",
    minutes: 11,
    description:
      "Downtime planning, IT sequencing and employee communication for commercial moves.",
  },
  {
    slug: "supplies-calculator",
    title: "Packing supplies estimator",
    kind: "download",
    description: "How many boxes, rolls of tape and pounds of paper a home your size really needs.",
  },
];

export const RESOURCE_KINDS: Array<{ key: ResourceItem["kind"]; label: string }> = [
  { key: "guide", label: "Guides" },
  { key: "checklist", label: "Checklists" },
  { key: "video", label: "Videos" },
  { key: "download", label: "Downloads" },
  { key: "faq", label: "FAQ" },
  { key: "tip", label: "Moving tips" },
];

// ── AI tools (architecture only) ───────────────────────────────────────────
export interface AiTool {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Tools that already exist as a shipped, non-AI experience. */
  liveHref?: string;
}

export const AI_TOOLS: AiTool[] = [
  {
    slug: "cost-estimator",
    name: "AI Cost Estimator",
    tagline: "Instant, itemized moving price",
    description:
      "Prices your actual inventory, access, distance and services instead of a bedroom count.",
    liveHref: "/calculator",
  },
  {
    slug: "packing-assistant",
    name: "AI Packing Assistant",
    tagline: "Know exactly what to pack, and when",
    description:
      "Turns your inventory into a room-by-room packing plan with supply counts and a schedule.",
  },
  {
    slug: "inventory-generator",
    name: "AI Inventory Generator",
    tagline: "Photo to inventory in seconds",
    description:
      "Builds a complete cubic-foot inventory from a walkthrough description or room photos.",
  },
  {
    slug: "timeline-planner",
    name: "AI Timeline Planner",
    tagline: "Your move, scheduled backwards",
    description: "Generates a dated task plan from your move date, lease dates and closing dates.",
  },
  {
    slug: "budget-planner",
    name: "AI Budget Planner",
    tagline: "No surprise line items",
    description:
      "Projects total relocation spend including movers, supplies, deposits, travel and utilities.",
  },
];

// ── Store categories ───────────────────────────────────────────────────────
export type StoreCategory =
  | "planning"
  | "packing"
  | "budget"
  | "inventory"
  | "business"
  | "templates";

export const STORE_CATEGORIES: Array<{ key: StoreCategory; label: string; blurb: string }> = [
  { key: "planning", label: "Planning", blurb: "Timelines, schedules and move-day plans." },
  { key: "packing", label: "Packing", blurb: "Labels, supply lists and packing systems." },
  { key: "budget", label: "Budget", blurb: "Cost trackers and deposit worksheets." },
  { key: "inventory", label: "Inventory", blurb: "Room-by-room inventory and valuation sheets." },
  { key: "business", label: "Business", blurb: "Tools for moving companies and office moves." },
  { key: "templates", label: "Templates", blurb: "Editable documents you can reuse." },
];

const CATEGORY_KEYWORDS: Array<[StoreCategory, string[]]> = [
  ["packing", ["pack", "label", "box", "supply", "supplies", "wrap"]],
  ["budget", ["budget", "cost", "price", "expense", "deposit", "finance"]],
  ["inventory", ["inventory", "valuation", "catalog", "photo"]],
  ["business", ["company", "business", "crm", "office", "commercial", "invoice", "contract"]],
  ["templates", ["template", "letter", "form", "worksheet", "printable"]],
  ["planning", ["plan", "timeline", "checklist", "schedule", "guide", "day"]],
];

/** Derives a store category from product copy — no schema change required. */
export function categorizeProduct(p: {
  title: string;
  description?: string | null;
  slug?: string;
}): StoreCategory {
  const hay = `${p.title} ${p.description ?? ""} ${p.slug ?? ""}`.toLowerCase();
  for (const [cat, words] of CATEGORY_KEYWORDS) {
    if (words.some((w) => hay.includes(w))) return cat;
  }
  return "planning";
}

// ── Blog categories ────────────────────────────────────────────────────────
export type BlogCategory =
  | "local-moving"
  | "long-distance"
  | "interstate"
  | "packing"
  | "storage"
  | "moving-tips"
  | "office-moving"
  | "family-moving";

export const BLOG_CATEGORIES: Array<{ key: BlogCategory; label: string }> = [
  { key: "local-moving", label: "Local Moving" },
  { key: "long-distance", label: "Long Distance" },
  { key: "interstate", label: "Interstate" },
  { key: "packing", label: "Packing" },
  { key: "storage", label: "Storage" },
  { key: "moving-tips", label: "Moving Tips" },
  { key: "office-moving", label: "Office Moving" },
  { key: "family-moving", label: "Family Moving" },
];

const BLOG_KEYWORDS: Array<[BlogCategory, string[]]> = [
  ["interstate", ["interstate", "state line", "cross-country", "cross country"]],
  ["long-distance", ["long distance", "long-distance", "coast", "miles"]],
  ["packing", ["pack", "box", "bubble", "fragile", "wrap"]],
  ["storage", ["storage", "warehouse", "container"]],
  ["office-moving", ["office", "commercial", "business", "corporate"]],
  ["family-moving", ["family", "kids", "children", "pets", "baby"]],
  ["local-moving", ["local", "apartment", "city", "same-day"]],
];

export function categorizePost(p: {
  title: string;
  excerpt?: string | null;
  slug?: string;
}): BlogCategory {
  const hay = `${p.title} ${p.excerpt ?? ""} ${p.slug ?? ""}`.toLowerCase();
  for (const [cat, words] of BLOG_KEYWORDS) {
    if (words.some((w) => hay.includes(w))) return cat;
  }
  return "moving-tips";
}
