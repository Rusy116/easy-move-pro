/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 14 — Research, Planner and Self-Improvement agents (server-only).
//
// Every agent degrades to a deterministic template when the AI gateway is
// unavailable, so the factory never stalls.
// ---------------------------------------------------------------------------
import { aiJson } from "../pdf-factory.server";
import { slugify } from "./catalog";
import { uniqueTitle } from "./naming";
import {
  RESEARCH_SOURCES,
  PRODUCT_TAXONOMY,
  clusterFor,
  inferIntent,
  inferSeasonality,
  opportunityScore,
} from "./research";

export interface ResearchedKeyword {
  keyword: string;
  source: string;
  cluster: string;
  category_slug: string;
  intent: string;
  seasonality: string;
  volume_score: number;
  difficulty_score: number;
  opportunity_score: number;
  notes: string | null;
}

const SEED_MODIFIERS = [
  "checklist printable",
  "planner pdf",
  "template free",
  "worksheet",
  "inventory sheet",
  "labels printable",
  "budget calculator",
  "timeline pdf",
  "guide pdf",
  "forms printable",
];

function seedKeywords(count: number): ResearchedKeyword[] {
  const out: ResearchedKeyword[] = [];
  let i = 0;
  for (const t of PRODUCT_TAXONOMY) {
    for (const mod of SEED_MODIFIERS) {
      if (out.length >= count) return out;
      const keyword = `${t.cluster.toLowerCase()} moving ${mod}`;
      const volume = 40 + ((i * 17) % 55);
      const difficulty = 15 + ((i * 23) % 45);
      out.push({
        keyword,
        source: RESEARCH_SOURCES[i % RESEARCH_SOURCES.length]!,
        cluster: t.cluster,
        category_slug: t.category_slug,
        intent: inferIntent(keyword),
        seasonality: inferSeasonality(keyword),
        volume_score: volume,
        difficulty_score: difficulty,
        opportunity_score: opportunityScore(volume, difficulty),
        notes: "Template research seed",
      });
      i += 1;
    }
  }
  return out;
}

/** AI Research Agent — scans the demand landscape and returns new keywords. */
export async function researchKeywords(count: number, existing: Set<string>): Promise<ResearchedKeyword[]> {
  const ai = await aiJson<{ keywords: Array<Record<string, any>> }>(
    [
      `You are the Research Agent for a US moving marketplace that sells printable PDF products.`,
      `Model the demand landscape across Google, Bing, Reddit, Pinterest, Etsy, Amazon, YouTube, moving blogs and competitor sites.`,
      `Return ${count} NEW long-tail keywords worth building a printable product around.`,
      `Avoid these keywords: ${Array.from(existing).slice(0, 80).join("; ") || "none"}.`,
      `source must be one of: ${RESEARCH_SOURCES.join(", ")}.`,
      `cluster must be one of: ${PRODUCT_TAXONOMY.map((t) => t.cluster).join(", ")}.`,
      `intent: informational | commercial | transactional. seasonality: evergreen | seasonal.`,
      `volume_score and difficulty_score are 0-100 integers. Favour high volume with low difficulty.`,
      `No invented statistics — scores are relative estimates only.`,
    ].join("\n"),
    {
      type: "object",
      additionalProperties: false,
      required: ["keywords"],
      properties: {
        keywords: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["keyword", "source", "cluster", "intent", "seasonality", "volume_score", "difficulty_score", "notes"],
            properties: {
              keyword: { type: "string" },
              source: { type: "string" },
              cluster: { type: "string" },
              intent: { type: "string" },
              seasonality: { type: "string" },
              volume_score: { type: "number" },
              difficulty_score: { type: "number" },
              notes: { type: "string" },
            },
          },
        },
      },
    },
    "pdf_research",
  );

  const rows: ResearchedKeyword[] = (ai?.keywords ?? []).map((k) => {
    const keyword = String(k.keyword ?? "").slice(0, 120);
    const fallback = clusterFor(keyword);
    const taxonomy = PRODUCT_TAXONOMY.find((t) => t.cluster.toLowerCase() === String(k.cluster ?? "").toLowerCase());
    const volume = Math.round(Number(k.volume_score ?? 50));
    const difficulty = Math.round(Number(k.difficulty_score ?? 40));
    return {
      keyword,
      source: RESEARCH_SOURCES.includes(k.source) ? String(k.source) : "google",
      cluster: (taxonomy ?? fallback).cluster,
      category_slug: (taxonomy ?? fallback).category_slug,
      intent: inferIntent(keyword),
      seasonality: String(k.seasonality ?? inferSeasonality(keyword)),
      volume_score: volume,
      difficulty_score: difficulty,
      opportunity_score: opportunityScore(volume, difficulty),
      notes: k.notes ? String(k.notes).slice(0, 300) : null,
    };
  });

  const merged = rows.length ? rows : seedKeywords(count * 2);
  const seen = new Set<string>();
  return merged
    .filter((r) => r.keyword.length > 5)
    .filter((r) => !existing.has(r.keyword.toLowerCase()))
    .filter((r) => (seen.has(r.keyword.toLowerCase()) ? false : (seen.add(r.keyword.toLowerCase()), true)))
    .slice(0, count);
}

/** AI Product Planner — turns clustered keywords into unique product briefs. */
export async function planProducts(keywords: ResearchedKeyword[], takenSlugs: Set<string>) {
  const ai = await aiJson<{ products: Array<{ keyword: string; title: string }> }>(
    [
      `You are the Product Planner for a printable PDF store for US movers.`,
      `Turn each keyword below into one distinctive, specific product title (max 70 chars, title case, no quotes).`,
      keywords.map((k) => `- ${k.keyword} (${k.cluster})`).join("\n"),
    ].join("\n"),
    {
      type: "object",
      additionalProperties: false,
      required: ["products"],
      properties: {
        products: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["keyword", "title"],
            properties: { keyword: { type: "string" }, title: { type: "string" } },
          },
        },
      },
    },
    "pdf_planner",
  );

  const titleFor = (k: ResearchedKeyword) => {
    const hit = ai?.products?.find((p) => p.keyword?.toLowerCase() === k.keyword.toLowerCase());
    const raw = hit?.title ? String(hit.title) : `${k.keyword} kit`;
    // uniqueTitle cleans stutters/filler and guarantees a free slug.
    return uniqueTitle(raw, takenSlugs);
  };

  return keywords
    .map((k) => ({ keyword: k, title: titleFor(k) }))
    .map((r) => ({ ...r, slug: slugify(r.title) }))
    .filter((r) => r.slug.length > 4);
}


/**
 * Self-Improvement Agent — reads live performance (views, downloads, revenue,
 * ratings) and rewrites the weakest merchandising levers on published rows.
 */
export async function improveProducts(db: any, limit: number) {
  const { data } = await db
    .from("pdf_products")
    .select(
      "slug,title,subtitle,seo_title,meta_description,views,clicks,downloads,revenue_cents,rating,review_count,price_cents,compare_at_cents,is_featured,is_bestseller,seo_score,last_improved_at",
    )
    .eq("status", "published")
    .order("last_improved_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  const rows = (data ?? []) as any[];
  const changes: Array<{ slug: string; change: string }> = [];

  for (const p of rows) {
    const views = Number(p.views ?? 0);
    const downloads = Number(p.downloads ?? 0);
    const conversion = views > 0 ? downloads / views : 0;
    const patch: Record<string, unknown> = { last_improved_at: new Date().toISOString() };
    const notes: string[] = [];

    // Weak CTR → sharpen the metadata.
    if (views >= 20 && conversion < 0.05) {
      const sharper = `${p.title} — Free Printable PDF (Instant Download)`;
      if (p.seo_title !== sharper) {
        patch.seo_title = sharper.slice(0, 120);
        notes.push("rewrote SEO title for CTR");
      }
      if (!p.meta_description || String(p.meta_description).length < 110) {
        patch.meta_description = `${p.title}: a print-ready PDF from Easy Moving. Download instantly, print at home and check off every step of your move.`.slice(0, 158);
        notes.push("expanded meta description");
      }
    }

    // Strong conversion → merchandise it harder and anchor the price.
    if (downloads >= 25 && !p.is_bestseller) {
      patch.is_bestseller = true;
      notes.push("promoted to bestsellers");
    }
    if (Number(p.price_cents ?? 0) > 0 && !p.compare_at_cents) {
      patch.compare_at_cents = Number(p.price_cents) * 2;
      notes.push("added compare-at anchor");
    }

    // Highly rated → feature it.
    if (Number(p.rating ?? 0) >= 4.5 && Number(p.review_count ?? 0) >= 3 && !p.is_featured) {
      patch.is_featured = true;
      notes.push("featured on the storefront");
    }

    if (!notes.length) continue;
    patch.improvement_notes = notes.join("; ");
    await db.from("pdf_products").update(patch).eq("slug", p.slug);
    await db.from("pdf_publish_log").insert({ product_slug: p.slug, action: "improved", detail: notes.join("; ") });
    changes.push({ slug: p.slug, change: notes.join("; ") });
  }

  return changes;
}

/** Recompute rating + review_count from the review table. */
export async function syncRatings(db: any, slugs: string[]) {
  for (const slug of slugs) {
    const { data } = await db.from("pdf_reviews").select("rating").eq("product_slug", slug).eq("status", "approved");
    const list = ((data ?? []) as any[]).map((r) => Number(r.rating));
    const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    await db
      .from("pdf_products")
      .update({ rating: Number(avg.toFixed(2)), review_count: list.length })
      .eq("slug", slug);
  }
}
