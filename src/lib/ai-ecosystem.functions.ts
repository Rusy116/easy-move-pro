// ---------------------------------------------------------------------------
// AI ECOSYSTEM — runtime server functions for the agents that had no runtime
// yet: Blog (6), Moving Company Growth (7), Digital Product (8), Image (9)
// and Revenue (12), plus a read-only ecosystem status rollup.
//
// Admin-gated. Read-only over CRM/marketplace/finance tables — this module
// never writes to quotes, jobs, invoices or any customer-facing record.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ECOSYSTEM_AGENTS } from "./ai/ecosystem";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

// ── Topic pools ────────────────────────────────────────────────────────────
const CUSTOMER_TOPICS = [
  "How much does a local move cost in 2026",
  "Moving checklist: 8 weeks to moving day",
  "How to pack a kitchen without breaking anything",
  "Studio vs 2-bedroom move: what actually changes the price",
  "Long-distance moving: what movers charge for and why",
  "Moving with stairs and no elevator: the real cost",
  "Storage during a move: when it saves money",
  "How to spot a moving scam before you pay a deposit",
  "Packing supplies calculator: how many boxes do you need",
  "Moving day timeline: hour by hour",
];

const MOVER_TOPICS = [
  "How moving companies get exclusive leads that actually convert",
  "Moving company CRM: what to track after the first call",
  "Google Business Profile for movers: a practical setup",
  "Pricing strategy for local moves without racing to the bottom",
  "How to respond to a lead in under 12 hours every time",
  "Dispatch scheduling for a 3-truck moving company",
  "Reviews engine: turning completed moves into referrals",
  "Marketplace vs shared leads: the math for movers",
];

const PRODUCT_IDEAS = [
  { title: "Ultimate Moving Checklist", product_type: "checklist", price_cents: 900 },
  { title: "Room-by-Room Inventory Sheet", product_type: "template", price_cents: 1200 },
  { title: "8-Week Moving Planner", product_type: "planner", price_cents: 1900 },
  { title: "Printable Moving Box Labels", product_type: "printable", price_cents: 700 },
  { title: "Packing Supplies Estimator", product_type: "template", price_cents: 1500 },
  { title: "Moving Budget Tracker", product_type: "template", price_cents: 1400 },
  { title: "First Night Essentials Guide", product_type: "guide", price_cents: 500 },
];

const CUSTOMER_LINKS = [
  { label: "Instant moving quote calculator", to: "/calculator" },
  { label: "Browse cities we serve", to: "/cities" },
  { label: "Moving services", to: "/services" },
  { label: "Digital products store", to: "/store" },
];
const MOVER_LINKS = [
  { label: "Exclusive moving leads", to: "/exclusive-moving-leads" },
  { label: "Join the marketplace", to: "/register-company" },
  { label: "Moving company CRM", to: "/moving-company-crm" },
  { label: "Open marketplace", to: "/open-marketplace" },
];

const ARTICLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { h2: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } } },
        required: ["h2", "paragraphs"],
      },
    },
    meta_description: { type: "string" },
    keyword: { type: "string" },
  },
  required: ["title", "summary", "sections", "meta_description", "keyword"],
} as const;

interface Article {
  title: string;
  summary: string;
  sections: { h2: string; paragraphs: string[] }[];
  meta_description: string;
  keyword: string;
}

function templateArticle(topic: string, audience: "customer" | "mover"): Article {
  const who = audience === "customer" ? "people planning a move" : "moving company owners";
  return {
    title: topic,
    summary: `A practical, no-fluff guide for ${who}.`,
    sections: [
      {
        h2: "What matters most",
        paragraphs: [
          `${topic} comes down to a handful of variables you can control: volume, distance, access and timing.`,
          `Use the numbers from a real estimate rather than an average — every move is priced from its own inputs.`,
        ],
      },
      {
        h2: "Next step",
        paragraphs: [
          audience === "customer"
            ? "Run your details through the instant calculator to see a real price range in under a minute."
            : "Join the Easy Moving marketplace to receive exclusive, verified leads in your service area.",
        ],
      },
    ],
    meta_description: `${topic} — practical guidance from Easy Moving.`,
    keyword: topic.toLowerCase(),
  };
}

function renderMarkdown(a: Article, audience: "customer" | "mover") {
  const links = audience === "customer" ? CUSTOMER_LINKS : MOVER_LINKS;
  const body = a.sections
    .map((s) => `## ${s.h2}\n\n${s.paragraphs.join("\n\n")}`)
    .join("\n\n");
  const cta =
    audience === "customer"
      ? "\n\n## Get your instant estimate\n\nEnter your ZIP codes and inventory in the [instant moving quote calculator](/calculator) — no phone calls, no lead blasts.\n"
      : "\n\n## Grow with Easy Moving\n\nGet exclusive, verified moving leads with a 12-hour response window. [Register your company](/register-company).\n";
  const related = `\n\n## Related\n\n${links.map((l) => `- [${l.label}](${l.to})`).join("\n")}\n`;
  return `${body}${cta}${related}`;
}

async function writeArticles(
  context: Ctx,
  audience: "customer" | "mover",
  count: number,
): Promise<{ created: number; aiGenerated: number; titles: string[] }> {
  const { generateJson } = await import("./ai-ecosystem.server");
  const pool = audience === "customer" ? CUSTOMER_TOPICS : MOVER_TOPICS;
  const agentKey = audience === "customer" ? "blog_agent" : "mover_growth_agent";
  const kind = audience === "customer" ? "blog_article" : "mover_article";

  const { data: existing } = await context.supabase
    .from("ai_content_items")
    .select("slug")
    .eq("agent_key", agentKey);
  const taken = new Set((existing ?? []).map((r: { slug: string | null }) => r.slug));

  const todo = pool.filter((t) => !taken.has(slugify(t))).slice(0, Math.max(1, Math.min(count, 10)));
  const titles: string[] = [];
  let aiGenerated = 0;

  for (const topic of todo) {
    const ai = await generateJson<Article>(
      "ecosystem_article",
      ARTICLE_SCHEMA as unknown as Record<string, unknown>,
      [
        `Write a genuinely useful SEO article for ${audience === "customer" ? "US moving customers" : "US moving company owners"}.`,
        `Topic: ${topic}`,
        `4-6 sections, 2-3 paragraphs each, plain English, no fabricated statistics, awards or testimonials.`,
        audience === "customer"
          ? `Naturally reference the Easy Moving instant calculator and city pages.`
          : `Naturally reference the Easy Moving marketplace, exclusive leads and the mover CRM.`,
        `meta_description must be 140-160 characters.`,
      ].join("\n"),
    );
    const article = ai ?? templateArticle(topic, audience);
    if (ai) aiGenerated += 1;

    const { error } = await context.supabase.from("ai_content_items").insert({
      kind,
      title: article.title,
      slug: slugify(topic),
      locale: "en",
      summary: article.summary,
      body: renderMarkdown(article, audience),
      keyword: article.keyword,
      agent_key: agentKey,
      status: "draft",
      quality_score: ai ? 92 : 80,
      seo: {
        title: article.title,
        description: article.meta_description,
        audience,
        internal_links: (audience === "customer" ? CUSTOMER_LINKS : MOVER_LINKS).map((l) => l.to),
      },
      schema_markup: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.meta_description,
      },
    });
    if (error) throw new Error(error.message);
    titles.push(article.title);
  }

  return { created: titles.length, aiGenerated, titles };
}

// ── Agent 6: Blog Agent ────────────────────────────────────────────────────
export const runBlogAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number }) => ({ count: Math.min(Math.max(d?.count ?? 3, 1), 10) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    return writeArticles(context as Ctx, "customer", data.count);
  });

// ── Agent 7: Moving Company Growth Agent ───────────────────────────────────
export const runGrowthAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number }) => ({ count: Math.min(Math.max(d?.count ?? 3, 1), 10) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    return writeArticles(context as Ctx, "mover", data.count);
  });

// ── Agent 8: Digital Product Agent ─────────────────────────────────────────
export const runProductAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number }) => ({ count: Math.min(Math.max(d?.count ?? 2, 1), 7) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const ctx = context as Ctx;

    const { data: existing } = await ctx.supabase.from("ai_products").select("slug");
    const taken = new Set((existing ?? []).map((r: { slug: string | null }) => r.slug));
    const todo = PRODUCT_IDEAS.filter((p) => !taken.has(slugify(p.title))).slice(0, data.count);

    const created: string[] = [];
    for (const idea of todo) {
      const slug = slugify(idea.title);
      const { error } = await ctx.supabase.from("ai_products").insert({
        title: idea.title,
        slug,
        product_type: idea.product_type,
        description: `${idea.title} — a ready-to-use ${idea.product_type} from Easy Moving, built around the same data that powers our instant moving calculator.`,
        price_cents: idea.price_cents,
        status: "draft",
        quality_score: 88,
        agent_key: "product_factory",
        seo: {
          title: `${idea.title} | Easy Moving Store`,
          description: `Download the ${idea.title.toLowerCase()} and plan your move with confidence. Pairs with the free Easy Moving calculator.`,
          internal_links: ["/store", "/calculator", "/cities"],
        },
        preview_urls: [],
        assets: [{ kind: "pdf", status: "pending_build", filename: `${slug}.pdf` }],
        bundle_of: [],
      });
      if (error) throw new Error(error.message);
      created.push(idea.title);
    }
    return { created: created.length, titles: created };
  });

// ── Agent 9: Image Agent ───────────────────────────────────────────────────
export const runImageAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => ({ limit: Math.min(Math.max(d?.limit ?? 20, 1), 100) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const ctx = context as Ctx;

    const { data: items } = await ctx.supabase
      .from("ai_content_items")
      .select("id,title,seo")
      .limit(data.limit);

    let contentBriefed = 0;
    for (const it of (items ?? []) as { id: string; title: string; seo: Record<string, unknown> }[]) {
      if (it.seo && (it.seo as { images?: unknown }).images) continue;
      const { error } = await ctx.supabase
        .from("ai_content_items")
        .update({
          seo: {
            ...(it.seo ?? {}),
            images: {
              featured: { w: 1600, h: 900, alt: it.title, prompt: `Editorial hero image for "${it.title}", warm neutral palette, no text` },
              og: { w: 1200, h: 630, alt: it.title, prompt: `OpenGraph card for "${it.title}", Easy Moving brand, clean geometry` },
              pinterest: { w: 1000, h: 1500, alt: it.title, prompt: `Vertical Pinterest graphic for "${it.title}"` },
            },
          },
        })
        .eq("id", it.id);
      if (error) throw new Error(error.message);
      contentBriefed += 1;
    }

    const { data: products } = await ctx.supabase
      .from("ai_products")
      .select("id,title,seo,cover_url")
      .is("cover_url", null)
      .limit(data.limit);

    let productsBriefed = 0;
    for (const p of (products ?? []) as { id: string; title: string; seo: Record<string, unknown> }[]) {
      const { error } = await ctx.supabase
        .from("ai_products")
        .update({
          seo: {
            ...(p.seo ?? {}),
            cover_brief: { w: 1200, h: 1600, alt: p.title, prompt: `Product cover for "${p.title}", printable mockup, soft shadow` },
          },
        })
        .eq("id", p.id);
      if (error) throw new Error(error.message);
      productsBriefed += 1;
    }

    return { contentBriefed, productsBriefed };
  });

// ── Agent 12: Revenue Agent (read-only rollup) ─────────────────────────────
export const runRevenueAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const ctx = context as Ctx;

    const [{ data: comms }, { data: purchases }, { data: prods }] = await Promise.all([
      ctx.supabase.from("company_commissions").select("amount,broker_amount,status,created_at"),
      ctx.supabase.from("customer_purchases").select("amount_cents,status"),
      ctx.supabase.from("ai_products").select("revenue_cents,downloads"),
    ]);

    const rows = (comms ?? []) as { amount: number | null; broker_amount: number | null; status: string; created_at: string }[];
    const paid = rows.filter((r) => r.status === "paid");
    const platformRevenue = paid.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const brokerRevenue = paid.reduce((s, r) => s + Number(r.broker_amount ?? 0), 0);
    const pipeline = rows
      .filter((r) => r.status !== "paid" && r.status !== "cancelled")
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const since = Date.now() - 30 * 86400000;
    const mrr = paid
      .filter((r) => new Date(r.created_at).getTime() >= since)
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const productRevenue =
      ((purchases ?? []) as { amount_cents: number | null; status: string }[])
        .filter((p) => p.status === "paid" || p.status === "completed")
        .reduce((s, p) => s + Number(p.amount_cents ?? 0), 0) / 100 +
      ((prods ?? []) as { revenue_cents: number | null }[]).reduce(
        (s, p) => s + Number(p.revenue_cents ?? 0),
        0,
      ) /
        100;

    const ltv = paid.length ? Math.round((platformRevenue / paid.length) * 100) / 100 : 0;
    const day = new Date().toISOString().slice(0, 10);

    for (const [metric, value] of [
      ["revenue_platform", platformRevenue],
      ["revenue_broker", brokerRevenue],
      ["revenue_products", productRevenue],
      ["revenue_pipeline", pipeline],
      ["revenue_mrr_30d", mrr],
      ["revenue_ltv", ltv],
    ] as [string, number][]) {
      await ctx.supabase
        .from("ai_metrics_daily")
        .insert({ day, metric, value, dims: { agent: "revenue_agent" } });
    }

    return { platformRevenue, brokerRevenue, productRevenue, pipeline, mrr, ltv, deals: paid.length };
  });

// ── Ecosystem status rollup ────────────────────────────────────────────────
export const ecosystemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const ctx = context as Ctx;

    const count = async (table: string, build?: (q: any) => any) => {
      let q = ctx.supabase.from(table).select("id", { count: "exact", head: true });
      if (build) q = build(q);
      const { count: c } = await q;
      return c ?? 0;
    };

    const [
      cities,
      calcPublished,
      seoPublished,
      contentDrafts,
      contentPublished,
      products,
      queued,
      running,
      failed,
      agents,
    ] = await Promise.all([
      count("usa_cities"),
      count("city_landing_pages", (q) => q.eq("calculator_status", "published")),
      count("city_landing_pages", (q) => q.eq("seo_status", "published")),
      count("ai_content_items", (q) => q.eq("status", "draft")),
      count("ai_content_items", (q) => q.eq("status", "published")),
      count("ai_products"),
      count("ai_tasks", (q) => q.eq("status", "queued")),
      count("ai_tasks", (q) => q.eq("status", "running")),
      count("ai_tasks", (q) => q.eq("status", "failed")),
      ctx.supabase.from("ai_agents").select("key,status,last_run_at"),
    ]);

    const known = new Map<string, { status: string; last_run_at: string | null }>(
      ((agents as { data?: { key: string; status: string; last_run_at: string | null }[] }).data ?? []).map(
        (a) => [a.key, { status: a.status, last_run_at: a.last_run_at }],
      ),
    );

    return {
      totals: {
        cities,
        calcPublished,
        seoPublished,
        contentDrafts,
        contentPublished,
        products,
        queued,
        running,
        failed,
      },
      agents: ECOSYSTEM_AGENTS.map((a) => ({
        key: a.key,
        status: known.get(a.key)?.status ?? "not_registered",
        lastRunAt: known.get(a.key)?.last_run_at ?? null,
      })),
    };
  });
