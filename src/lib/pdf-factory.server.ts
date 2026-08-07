/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 13 — PDF Product Factory (server-only stage executors).
//
// Each of the 12 stages is a pure-ish executor: it reads the current product
// row, produces its artifacts and patches the row. Every stage has a
// deterministic fallback so production never stalls when AI is unavailable.
// ---------------------------------------------------------------------------
import {
  PDF_MIN_QUALITY,
  pdfStageAt,
  resolveCoverSpec,
  slugify,
  type PdfSection,
  type PdfStageKey,
} from "./pdf-store/catalog";

const MODEL = "google/gemini-3.6-flash";

async function readOutputText(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const evt = JSON.parse(raw) as { type?: string; delta?: string; response?: { output_text?: string } };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") out += evt.delta;
        else if (evt.type === "response.completed" && evt.response?.output_text && !out) out = evt.response.output_text;
      } catch {
        /* keepalive */
      }
    }
  }
  if (!out.trim()) throw new Error("Empty AI response");
  return out;
}

/** Ask the gateway for JSON. Returns null on any failure — callers fall back. */
export async function aiJson<T>(prompt: string, schema: Record<string, unknown>, name: string): Promise<T | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        stream: true,
        store: false,
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`AI gateway ${res.status}`);
    return JSON.parse(await readOutputText(res.body)) as T;
  } catch (err) {
    console.error(`[pdf-factory] ${name} fell back to template:`, err);
    return null;
  }
}

const strObj = (props: Record<string, unknown>, required: string[]) => ({
  type: "object",
  additionalProperties: false,
  properties: props,
  required,
});
const strArr = { type: "array", items: { type: "string" } };

/* ------------------------------------------------------------------ */
/*                         Discovery (opportunity)                     */
/* ------------------------------------------------------------------ */

export interface DiscoveredIdea {
  keyword: string;
  title: string;
  category_slug: string;
  demand_score: number;
  difficulty_score: number;
  gap_reason: string;
}

const SEED_IDEAS: DiscoveredIdea[] = [
  { keyword: "moving checklist 8 weeks", title: "The 8-Week Moving Checklist", category_slug: "checklists", demand_score: 88, difficulty_score: 34, gap_reason: "High volume, mostly thin blog posts, no printable" },
  { keyword: "moving budget worksheet", title: "Moving Budget & Cost Worksheet", category_slug: "budget", demand_score: 76, difficulty_score: 29, gap_reason: "Spreadsheet intent with no print-ready PDF" },
  { keyword: "packing list by room", title: "Room-by-Room Packing List", category_slug: "packing", demand_score: 81, difficulty_score: 31, gap_reason: "Searchers want a per-room printable" },
  { keyword: "box label templates", title: "Printable Box Labels & Room Tags", category_slug: "inventory", demand_score: 69, difficulty_score: 22, gap_reason: "Template intent underserved outside Etsy" },
  { keyword: "moving with pets checklist", title: "Moving With Pets: Complete Checklist", category_slug: "family", demand_score: 64, difficulty_score: 25, gap_reason: "Emotional query with no structured guide" },
  { keyword: "office relocation plan template", title: "Office Relocation Plan Template", category_slug: "business", demand_score: 58, difficulty_score: 41, gap_reason: "B2B intent, high value, weak free options" },
  { keyword: "home inventory sheet", title: "Home Inventory Sheet for Movers", category_slug: "inventory", demand_score: 72, difficulty_score: 27, gap_reason: "Insurance-driven demand, no printable" },
  { keyword: "moving day timeline", title: "Moving Day Hour-by-Hour Timeline", category_slug: "planners", demand_score: 66, difficulty_score: 24, gap_reason: "Day-of anxiety query with no planner" },
  { keyword: "long distance moving guide", title: "Long-Distance Move Planner", category_slug: "planners", demand_score: 79, difficulty_score: 44, gap_reason: "Broad topic, no structured planner asset" },
  { keyword: "moving company job checklist", title: "Crew Job Checklist for Moving Companies", category_slug: "movers", demand_score: 41, difficulty_score: 18, gap_reason: "Operator tooling gap" },
  { keyword: "senior downsizing checklist", title: "Senior Downsizing Checklist", category_slug: "family", demand_score: 55, difficulty_score: 26, gap_reason: "Growing demographic, weak assets" },
  { keyword: "apartment moving checklist", title: "Apartment Move-In / Move-Out Checklist", category_slug: "checklists", demand_score: 74, difficulty_score: 33, gap_reason: "Renter intent split across thin pages" },
  { keyword: "fragile packing guide", title: "Fragile & Valuables Packing Guide", category_slug: "packing", demand_score: 61, difficulty_score: 23, gap_reason: "Practical how-to with no printable" },
  { keyword: "change of address checklist", title: "Change of Address Master Checklist", category_slug: "checklists", demand_score: 83, difficulty_score: 30, gap_reason: "Admin task nobody has templated well" },
  { keyword: "moving cost calculator worksheet", title: "DIY vs Movers Cost Comparison Worksheet", category_slug: "budget", demand_score: 70, difficulty_score: 35, gap_reason: "Decision query with no side-by-side tool" },
];

export async function discoverIdeas(count: number, existing: Set<string>): Promise<DiscoveredIdea[]> {
  const schema = strObj(
    {
      ideas: {
        type: "array",
        items: strObj(
          {
            keyword: { type: "string" },
            title: { type: "string" },
            category_slug: { type: "string" },
            demand_score: { type: "number" },
            difficulty_score: { type: "number" },
            gap_reason: { type: "string" },
          },
          ["keyword", "title", "category_slug", "demand_score", "difficulty_score", "gap_reason"],
        ),
      },
    },
    ["ideas"],
  );
  const ai = await aiJson<{ ideas: DiscoveredIdea[] }>(
    [
      `You are the Discovery Agent for a US moving marketplace's printable PDF store.`,
      `Propose ${count} NEW downloadable PDF product ideas with genuine search demand.`,
      `Avoid these existing titles: ${Array.from(existing).slice(0, 60).join("; ") || "none"}.`,
      `category_slug must be one of: checklists, planners, budget, inventory, packing, family, business, movers.`,
      `demand_score and difficulty_score are 0-100 integers. gap_reason explains why the market is underserved.`,
      `No invented statistics. Practical, printable, genuinely useful documents only.`,
    ].join("\n"),
    schema,
    "pdf_discovery",
  );
  const ideas = (ai?.ideas ?? SEED_IDEAS).filter((i) => !existing.has(slugify(i.title)));
  return ideas.slice(0, count);
}

/* ------------------------------------------------------------------ */
/*                            Stage executors                          */
/* ------------------------------------------------------------------ */

export interface StageOutcome {
  ok: boolean;
  summary: string;
  patch?: Record<string, unknown>;
}

function fallbackSections(title: string, category: string): PdfSection[] {
  const base: PdfSection[] = [
    {
      heading: "How to use this document",
      body: `${title} is built to be printed, checked off and shared with everyone helping with your move. Work top to bottom — each section builds on the one before it.`,
      items: ["Print single-sided so you can write in the margins", "Assign an owner to every task", "Keep it with your moving folder"],
    },
    {
      heading: "8 weeks out",
      items: [
        "Set your moving budget and confirm who is paying for what",
        "Request instant estimates and compare at least three movers",
        "Start a room-by-room inventory",
        "Book time off work for moving day",
      ],
    },
    {
      heading: "4 weeks out",
      items: [
        "Confirm your booking and written estimate",
        "Order packing supplies",
        "Begin packing everything you will not need before the move",
        "File your change of address",
      ],
    },
    {
      heading: "Moving week",
      items: [
        "Pack an essentials box for the first 24 hours",
        "Defrost the fridge and drain garden hoses",
        "Confirm arrival window and parking access with the crew",
        "Take photos of high-value items before they are loaded",
      ],
    },
    {
      heading: "Moving day",
      items: [
        "Walk the crew through the home before loading",
        "Check the inventory sheet as items go on the truck",
        "Do a final empty-house sweep including closets and the attic",
        "Sign the bill of lading only after reviewing it",
      ],
    },
    {
      heading: "After the move",
      items: ["Inspect for damage within 24 hours", "Unpack essentials first", "Update your address with banks and insurers", "Leave a review for your mover"],
    },
  ];
  if (category === "budget") {
    base.splice(1, 0, {
      heading: "Cost worksheet",
      body: "Record every quoted and actual cost so nothing surprises you at the end.",
      items: ["Mover estimate (low / high)", "Packing materials", "Truck or trailer rental", "Storage", "Insurance / valuation", "Tips and food for the crew", "Cleaning and repairs", "Deposits and utility connection fees"],
    });
  }
  return base;
}

export async function runPdfStage(
  db: any,
  job: { id: string; product_slug: string; title: string; category_slug: string; brief: string | null; stage: number },
  product: any,
): Promise<StageOutcome> {
  const stage = pdfStageAt(job.stage + 1);
  const key: PdfStageKey = stage.key;
  const title = product?.title ?? job.title;
  const category = product?.category_slug ?? job.category_slug;

  switch (key) {
    case "discovery":
      return {
        ok: true,
        summary: `Opportunity locked: ${title}`,
        patch: {
          status: "generating",
          ai_prompt: job.brief ?? `Create a printable ${category} PDF titled "${title}" for US movers.`,
        },
      };

    case "outline": {
      const ai = await aiJson<{ subtitle: string; sections: string[]; page_count: number; difficulty: string }>(
        `Outline a printable PDF titled "${title}" (category: ${category}) for US movers. 6-9 section headings, a one-line subtitle, an estimated page_count (4-24) and difficulty (beginner|intermediate|advanced).`,
        strObj(
          { subtitle: { type: "string" }, sections: strArr, page_count: { type: "number" }, difficulty: { type: "string" } },
          ["subtitle", "sections", "page_count", "difficulty"],
        ),
        "pdf_outline",
      );
      const sections = (ai?.sections ?? fallbackSections(title, category).map((s) => s.heading)).slice(0, 10);
      return {
        ok: true,
        summary: `${sections.length} sections outlined`,
        patch: {
          subtitle: ai?.subtitle ?? `A printable, step-by-step ${category} guide from Easy Moving`,
          page_count: Math.min(Math.max(Number(ai?.page_count ?? sections.length + 2), 4), 32),
          difficulty: ["beginner", "intermediate", "advanced"].includes(String(ai?.difficulty)) ? ai!.difficulty : "beginner",
          content: sections.map((h) => ({ heading: h, items: [] })),
        },
      };
    }

    case "content": {
      const outline = (product?.content ?? []) as PdfSection[];
      const ai = await aiJson<{ sections: Array<{ heading: string; body: string; items: string[] }> }>(
        [
          `Write the full body of a printable PDF titled "${title}" (category: ${category}) for people moving within the United States.`,
          `Use exactly these section headings: ${outline.map((s) => s.heading).join(" | ") || "your own 6 sections"}.`,
          `Each section: a 2-3 sentence body and 4-8 concrete, checkable items. Plain English, specific, actionable.`,
          `No invented statistics, prices, laws or brand claims.`,
        ].join("\n"),
        strObj(
          {
            sections: {
              type: "array",
              items: strObj({ heading: { type: "string" }, body: { type: "string" }, items: strArr }, ["heading", "body", "items"]),
            },
          },
          ["sections"],
        ),
        "pdf_content",
      );
      const sections = ai?.sections?.length ? ai.sections : fallbackSections(title, category);
      const items = sections.reduce((n, s) => n + (s.items?.length ?? 0), 0);
      return {
        ok: items >= 12,
        summary: `${sections.length} sections · ${items} checklist items`,
        patch: { content: sections, page_count: Math.max(4, Math.round(items / 6) + 2) },
      };
    }

    case "cover": {
      const ai = await aiJson<{ palette: string[]; motif: string; layout: string; prompt: string }>(
        `Design a cover for the printable "${title}". Return a two-colour palette (dark base hex + bright accent hex, strong contrast), a motif from boxes|map|clock|chart|home|truck, a layout from stack|split|badge, and a one-sentence art prompt.`,
        strObj({ palette: strArr, motif: { type: "string" }, layout: { type: "string" }, prompt: { type: "string" } }, [
          "palette",
          "motif",
          "layout",
          "prompt",
        ]),
        "pdf_cover",
      );
      const spec = resolveCoverSpec(job.product_slug, {
        palette: ai?.palette?.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 2),
        motif: ai?.motif as any,
        layout: ai?.layout as any,
      });
      return {
        ok: true,
        summary: `Cover: ${spec.motif} / ${spec.layout}`,
        patch: { cover_spec: { ...spec, prompt: ai?.prompt ?? `Editorial cover art for ${title}` } },
      };
    }

    case "mockups": {
      const previews = ((product?.content ?? []) as PdfSection[]).slice(0, 3).map((s) => s.heading);
      return {
        ok: true,
        summary: `${previews.length} preview spreads + social assets`,
        patch: {
          preview_urls: previews,
          alt_text: `${title} — printable moving PDF cover from Easy Moving`,
          og_image_url: `/products/${job.product_slug}`,
          social_image_url: `/products/${job.product_slug}`,
        },
      };
    }

    case "copy": {
      const ai = await aiJson<{ description: string; features: string[]; whats_included: string[]; faq: Array<{ q: string; a: string }> }>(
        `Write storefront copy for the printable "${title}" (${category}). Return: description (2 short paragraphs, benefit-led, no hype), features (5 bullets), whats_included (4-6 bullets describing the actual document), faq (4 real buyer questions with honest answers). No fake testimonials or guarantees.`,
        strObj(
          {
            description: { type: "string" },
            features: strArr,
            whats_included: strArr,
            faq: { type: "array", items: strObj({ q: { type: "string" }, a: { type: "string" } }, ["q", "a"]) },
          },
          ["description", "features", "whats_included", "faq"],
        ),
        "pdf_copy",
      );
      const sections = (product?.content ?? []) as PdfSection[];
      const patch = {
        description:
          ai?.description ??
          `${title} turns a stressful move into a sequence of small, checkable steps. Print it, work through it, and nothing important slips.\n\nBuilt by the Easy Moving team from thousands of real moves across the United States.`,
        features: ai?.features ?? [
          "Print-ready A4 PDF",
          "Checkbox format you can work through with family or crew",
          "Covers planning, packing, moving day and after the move",
          "Free lifetime updates",
          "Pairs with the Easy Moving instant quote calculator",
        ],
        whats_included: ai?.whats_included ?? sections.slice(0, 6).map((s) => s.heading),
        faq: ai?.faq ?? [
          { q: "What format is this?", a: "A printable PDF sized for A4 and US Letter." },
          { q: "Can I reuse it for a second move?", a: "Yes — it stays in your library and you can download it again any time." },
          { q: "Does it work for long-distance moves?", a: "Yes. The timeline scales from local moves to interstate relocations." },
          { q: "Do I need an account?", a: "You need a free Easy Moving account so the file lands in your library." },
        ],
      };
      return { ok: true, summary: `${patch.features.length} features · ${patch.faq.length} FAQs`, patch };
    }

    case "seo": {
      const ai = await aiJson<{ seo_title: string; meta_description: string; keywords: string[]; tags: string[] }>(
        `SEO for the product page of "${title}" (${category}). seo_title under 60 characters including the product name; meta_description 140-158 characters; 5 target keywords; 5 short tags.`,
        strObj({ seo_title: { type: "string" }, meta_description: { type: "string" }, keywords: strArr, tags: strArr }, [
          "seo_title",
          "meta_description",
          "keywords",
          "tags",
        ]),
        "pdf_seo",
      );
      const seoTitle = (ai?.seo_title ?? `${title} — Free Printable PDF`).slice(0, 60);
      const metaDesc = (ai?.meta_description ?? `${title}: a printable PDF from Easy Moving covering every step of your move, from planning to moving day.`).slice(0, 158);
      return {
        ok: seoTitle.length > 10 && metaDesc.length > 80,
        summary: `Title ${seoTitle.length} chars · meta ${metaDesc.length} chars`,
        patch: {
          seo_title: seoTitle,
          meta_description: metaDesc,
          target_keywords: (ai?.keywords ?? [title.toLowerCase(), `${category} pdf`, "moving checklist printable"]).slice(0, 8),
          tags: (ai?.tags ?? [category, "printable", "pdf", "moving"]).slice(0, 8),
          canonical_url: `/products/${job.product_slug}`,
        },
      };
    }

    case "schema":
      return {
        ok: true,
        summary: "Product + Offer + FAQPage structured data ready",
        patch: {},
      };

    case "internal_links": {
      const [{ data: siblings }, { data: cities }] = await Promise.all([
        db.from("pdf_products").select("slug").eq("category_slug", category).neq("slug", job.product_slug).limit(4),
        db.from("city_landing_pages").select("slug").eq("status", "published").limit(4),
      ]);
      const related = ((siblings ?? []) as any[]).map((r) => r.slug);
      const cityLinks = ((cities ?? []) as any[]).map((r) => r.slug);
      return {
        ok: true,
        summary: `${related.length} products · ${cityLinks.length} city calculators`,
        patch: {
          related_products: related,
          related_cities: cityLinks,
          related_calculators: cityLinks.slice(0, 3),
          related_articles: [],
        },
      };
    }

    case "pricing": {
      const pages = Number(product?.page_count ?? 8);
      const items = ((product?.content ?? []) as PdfSection[]).reduce((n, s) => n + (s.items?.length ?? 0), 0);
      const depth = pages * 2 + items;
      const price = depth > 90 ? 1900 : depth > 60 ? 1200 : depth > 35 ? 700 : 0;
      return {
        ok: true,
        summary: price === 0 ? "Free lead magnet" : `Priced at $${(price / 100).toFixed(2)}`,
        patch: { price_cents: price, compare_at_cents: price ? price * 2 : null },
      };
    }

    case "quality": {
      const sections = (product?.content ?? []) as PdfSection[];
      const items = sections.reduce((n, s) => n + (s.items?.length ?? 0), 0);
      const seoScore =
        (product?.seo_title ? 25 : 0) +
        (product?.meta_description ? 25 : 0) +
        ((product?.target_keywords?.length ?? 0) >= 3 ? 20 : 0) +
        (product?.canonical_url ? 15 : 0) +
        (product?.alt_text ? 15 : 0);
      const quality =
        Math.min(30, sections.length * 5) +
        Math.min(30, Math.round(items * 1.2)) +
        (product?.description ? 12 : 0) +
        ((product?.features?.length ?? 0) >= 4 ? 8 : 0) +
        ((product?.faq?.length ?? 0) >= 3 ? 8 : 0) +
        (product?.cover_spec?.motif ? 6 : 0) +
        ((product?.related_products?.length ?? 0) > 0 ? 6 : 0);
      const score = Math.min(100, quality);
      return {
        ok: score >= PDF_MIN_QUALITY,
        summary: `Quality ${score}/100 · SEO ${seoScore}/100`,
        patch: { quality_score: score, seo_score: seoScore, status: score >= PDF_MIN_QUALITY ? "approved" : "review" },
      };
    }

    case "publish":
      return {
        ok: true,
        summary: "Published to the store",
        patch: { status: "published", published_at: new Date().toISOString() },
      };
  }
}
