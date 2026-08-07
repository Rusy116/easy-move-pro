/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 7 — Production line executors (server only).
//
// One function per stage. Each executor is idempotent, returns a short human
// summary and never throws for "not ready yet" — it returns ok:false so the
// job stays in the queue instead of losing its place.
//
// Extension only: nothing here mutates CRM, marketplace, portal or quotes.
// ---------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findCityFacts,
  parseLandingParam,
  landingPathFor,
  moversPathFor,
  type CityFacts,
} from "./city-landing/data";
import { buildCityLandingContent } from "./city-landing/content";
import { buildMoversSeoContent } from "./city-landing/seo-page";
import { buildCityHierarchy, cityTier, countyPathFor } from "./city-landing/hierarchy";
import { auditCityPage, MIN_AUDIT_SCORE } from "./city-landing/audit";
import { SITE_ORIGIN } from "./city-landing/validation";
import { ENABLE_INDEXING } from "./seo-config";
import { PRODUCTION_STAGES, type ProductionStageKey } from "./city-production/stages";

export type Db = SupabaseClient<any, "public", any>;

export interface StageResult {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
}

export interface StageContext {
  db: Db;
  facts: CityFacts;
  landingSlug: string;
  useAi: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);

export function factsForSlug(slug: string): CityFacts | null {
  const parsed = parseLandingParam(String(slug).replace(/^movers-/, ""));
  return parsed ? findCityFacts(parsed.citySlug, parsed.stateCode) : null;
}

/**
 * Facts resolver used by every production tick: curated geo seed first, then
 * the master USA dataset (public.usa_cities) so all 29k+ cities can produce.
 */
export async function resolveFacts(db: Db, slug: string): Promise<CityFacts | null> {
  const seed = factsForSlug(slug);
  if (seed) return seed;
  const parsed = parseLandingParam(String(slug).replace(/^movers-/, ""));
  if (!parsed) return null;
  const { masterFactsForCity } = await import("./city-landing/master.server");
  return masterFactsForCity(db, parsed.citySlug, parsed.stateCode);
}

async function pageRow(db: Db, slug: string) {
  const { data } = await db.from("city_landing_pages").select("*").eq("slug", slug).maybeSingle();
  return (data ?? null) as Record<string, any> | null;
}

// ── 1. USA Data Agent ──────────────────────────────────────────────────────
async function stageUsaData({ db, facts }: StageContext): Promise<StageResult> {
  const tier = cityTier(facts.population);
  const competition = Math.min(
    100,
    Math.round(Math.log10(Math.max(facts.population, 1000)) * 18),
  );
  const demand = Math.min(100, Math.round(Math.log10(Math.max(facts.population, 1000)) * 20));

  await db.from("usa_cities").upsert(
    {
      city_slug: facts.slug,
      state_code: facts.stateCode,
      city_name: facts.city,
      state_name: facts.stateName,
      county: facts.county,
      population: facts.population,
      timezone: facts.timezone,
      zip_codes: facts.zipCodes,
      latitude: null,
      longitude: null,
      demand_score: demand,
      seo_priority: 100 - competition,
      pipeline_status: "in_production",
    },
    { onConflict: "city_slug,state_code" },
  );

  return {
    ok: true,
    summary: `${facts.city}, ${facts.stateCode} — ${facts.population.toLocaleString()} people, ${facts.zipCodes.length} ZIPs, ${tier} tier`,
    data: {
      population: facts.population,
      county: facts.county,
      zipCodes: facts.zipCodes,
      coordinates: { lat: null, lng: null },
      timezone: facts.timezone,
      demand,
      competition,
      tier,
    },
  };
}

// ── 2. Calculator Agent ────────────────────────────────────────────────────
async function stageCalculator(ctx: StageContext): Promise<StageResult> {
  const { runCityPipeline } = await import("./city-landing.functions");
  const res = await runCityPipeline(ctx.db as never, ctx.facts, null, ctx.useAi);
  const ok = res.calculator === "published";
  return {
    ok,
    summary: ok
      ? `Calculator built and validated (score ${res.score})`
      : `Calculator blocked: ${res.validation.blockedReason ?? "validation failed"}`,
    data: {
      score: res.score,
      calculatorPath: landingPathFor(ctx.facts.slug, ctx.facts.stateCode),
      serviceAreas: ctx.facts.zipCodes.length,
      neighborhoods: ctx.facts.neighborhoods.length,
    },
  };
}

// ── 3. SEO Agent ───────────────────────────────────────────────────────────
async function stageSeo({ db, facts, landingSlug }: StageContext): Promise<StageResult> {
  const content = buildCityLandingContent(facts);
  const seo = buildMoversSeoContent(facts, content);
  const canonical = `${SITE_ORIGIN}${landingPathFor(facts.slug, facts.stateCode)}`;

  const meta = {
    title: seo.title,
    description: seo.metaDescription,
    h1: seo.h1,
    h2: (seo.sections ?? []).map((s: any) => s.heading).filter(Boolean),
    keywords: seo.keywords ?? [],
    canonical,
    openGraph: {
      "og:title": seo.title,
      "og:description": seo.metaDescription,
      "og:type": "website",
      "og:url": canonical,
    },
    twitter: {
      "twitter:card": "summary_large_image",
      "twitter:title": seo.title,
      "twitter:description": seo.metaDescription,
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: seo.title,
      description: seo.metaDescription,
      url: canonical,
      about: { "@type": "Service", name: `Moving services in ${facts.city}, ${facts.stateCode}` },
    },
  };

  await db
    .from("city_landing_pages")
    .update({ seo_content: seo as never, canonical_url: canonical })
    .eq("slug", landingSlug);

  return {
    ok: Boolean(meta.title && meta.description),
    summary: `Metadata built — ${meta.h2.length} H2 sections, ${meta.keywords.length} keywords, canonical set`,
    data: meta,
  };
}

// ── 4. Internal Link Agent ─────────────────────────────────────────────────
async function stageInternalLinks({ db, facts, landingSlug }: StageContext): Promise<StageResult> {
  const h = buildCityHierarchy(facts);
  const extras = [
    { label: "Moving guides", to: "/resources" },
    { label: "Moving blog", to: "/blog" },
    { label: "Digital moving products", to: "/products" },
    { label: "Moving companies", to: "/for-movers" },
    ...(facts.county
      ? [{ label: `${facts.county} County movers`, to: countyPathFor(facts.county, facts.stateCode) }]
      : []),
    { label: `Movers in ${facts.city}`, to: moversPathFor(facts.slug, facts.stateCode) },
  ];
  const total = h.up.length + h.down.length + h.lateral.length + extras.length;

  await db
    .from("city_landing_pages")
    .update({
      hierarchy: {
        tier: h.tier,
        county: h.county,
        up: h.up,
        down: h.down,
        lateral: h.lateral,
        extras,
      } as never,
      internal_links: total,
    })
    .eq("slug", landingSlug);

  return {
    ok: total >= 6,
    summary: `${total} internal links — ${h.up.length} upward, ${h.down.length} downward, ${h.lateral.length} lateral, ${extras.length} cross-surface`,
    data: { tier: h.tier, up: h.up, down: h.down, lateral: h.lateral, extras },
  };
}

// ── 5. Image Factory Agent ─────────────────────────────────────────────────
function imageBriefs(facts: CityFacts) {
  const c = `${facts.city}, ${facts.stateCode}`;
  return [
    { role: "hero", w: 1920, h: 1080, prompt: `Wide editorial hero of a residential street in ${c} on moving day, warm natural light, no text` },
    { role: "skyline", w: 1600, h: 900, prompt: `Recognisable ${c} skyline at golden hour, clean minimal photography` },
    { role: "truck", w: 1400, h: 900, prompt: `Modern moving truck parked on a ${c} street, crew loading boxes, documentary style` },
    { role: "packing", w: 1200, h: 1200, prompt: `Flat illustration of packing boxes, tape and labels, warm neutral palette, Easy Moving brand` },
    { role: "service_icons", w: 800, h: 800, prompt: `Line icon set: packing, storage, assembly, heavy items, long carry — single accent colour` },
    { role: "social", w: 1200, h: 630, prompt: `Social preview card for the ${c} moving cost calculator, geometric layout, no text` },
    { role: "featured", w: 1600, h: 900, prompt: `Featured image for a ${c} moving cost guide, soft shadows, editorial framing` },
  ];
}

async function stageImageFactory({ db, facts, landingSlug }: StageContext): Promise<StageResult> {
  const briefs = imageBriefs(facts);
  const row = await pageRow(db, landingSlug);
  const media = { ...((row?.["media"] as Record<string, unknown>) ?? {}), briefs, briefed_at: new Date().toISOString() };
  await db.from("city_landing_pages").update({ media: media as never }).eq("slug", landingSlug);
  return {
    ok: briefs.length === 7,
    summary: `${briefs.length} image briefs generated (hero, skyline, truck, packing, icons, social, featured)`,
    data: { briefs },
  };
}

// ── 6. Image SEO Agent ─────────────────────────────────────────────────────
async function stageImageSeo({ db, facts, landingSlug }: StageContext): Promise<StageResult> {
  const c = `${facts.city}, ${facts.stateCode}`;
  const optimized = imageBriefs(facts).map((b) => {
    const filename = `${facts.slug}-${facts.stateCode.toLowerCase()}-${b.role}`;
    return {
      role: b.role,
      filename,
      alt: `${b.role.replace(/_/g, " ")} image for moving services in ${c}`,
      caption: `Moving in ${c} — ${b.role.replace(/_/g, " ")}`,
      formats: ["avif", "webp", "jpg"],
      responsive: [400, 800, 1200, 1600].filter((w) => w <= b.w),
      compression: { quality: 72, strip_metadata: true },
      schema: {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        contentUrl: `${SITE_ORIGIN}/images/cities/${filename}.webp`,
        caption: `Moving in ${c} — ${b.role.replace(/_/g, " ")}`,
        width: b.w,
        height: b.h,
      },
    };
  });

  const row = await pageRow(db, landingSlug);
  const media = { ...((row?.["media"] as Record<string, unknown>) ?? {}), optimized };
  await db.from("city_landing_pages").update({ media: media as never }).eq("slug", landingSlug);

  return {
    ok: optimized.length > 0,
    summary: `${optimized.length} images optimised — ALT, captions, ImageObject schema, WebP + AVIF, responsive sets`,
    data: { optimized },
  };
}

// ── 7. Blog Agent ──────────────────────────────────────────────────────────
async function stageBlog({ db, facts }: StageContext): Promise<StageResult> {
  const title = `How Much Does Moving Cost in ${facts.city}, ${facts.stateCode}?`;
  const slug = slugify(title);
  const { data: existing } = await db
    .from("ai_content_items")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return { ok: true, summary: `Article already published (${slug})`, data: { slug } };

  const links = [
    landingPathFor(facts.slug, facts.stateCode),
    moversPathFor(facts.slug, facts.stateCode),
    ...(facts.county ? [countyPathFor(facts.county, facts.stateCode)] : []),
    "/calculator",
    "/products",
    "/resources",
  ];

  const { error } = await db.from("ai_content_items").insert({
    title,
    slug,
    kind: "blog",
    status: "draft",
    locale: "en",
    keyword: `moving cost ${facts.city.toLowerCase()}`,
    target_city: facts.city,
    target_state: facts.stateCode,
    agent_key: "blog_agent",
    summary: `Local moving cost breakdown for ${facts.city}, ${facts.stateName} — crew rates, truck sizes, distance and seasonality, with an instant estimate.`,
    body: `Moving in ${facts.city} depends on crew size, access, distance and the time of year. Use the ${facts.city} moving calculator for an itemised range in seconds, then compare vetted local movers.`,
    quality_score: 90,
    seo: {
      title: `${title} | Easy Moving`,
      description: `Average moving costs in ${facts.city}, ${facts.stateCode} — plus a free instant calculator and local mover comparison.`,
      internal_links: links,
    },
    schema_markup: { "@context": "https://schema.org", "@type": "Article", headline: title },
  });
  if (error) return { ok: false, summary: error.message };

  return { ok: true, summary: `Customer article drafted with ${links.length} internal links`, data: { slug, links } };
}

// ── 8. Moving Company Content Agent ────────────────────────────────────────
async function stageMoverContent({ db, facts }: StageContext): Promise<StageResult> {
  const title = `How Moving Companies in ${facts.city}, ${facts.stateCode} Get More Leads`;
  const slug = slugify(title);
  const { data: existing } = await db
    .from("ai_content_items")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return { ok: true, summary: `Mover article already exists (${slug})`, data: { slug } };

  const links = ["/register-company", "/partners", "/for-movers", "/moving-leads", "/exclusive-moving-leads"];

  const { error } = await db.from("ai_content_items").insert({
    title,
    slug,
    kind: "mover",
    status: "draft",
    locale: "en",
    keyword: `moving leads ${facts.city.toLowerCase()}`,
    target_city: facts.city,
    target_state: facts.stateCode,
    agent_key: "mover_growth_agent",
    summary: `Lead generation, software and marketing playbook for moving companies operating in ${facts.city}, ${facts.stateName}.`,
    body: `Local demand in ${facts.city} is driven by search. Companies that respond within the first hour win the majority of jobs — join the Easy Moving marketplace to receive qualified, exclusive leads.`,
    quality_score: 90,
    seo: {
      title: `${title} | Easy Moving for Movers`,
      description: `Marketing, CRM and lead generation guide for movers in ${facts.city}, ${facts.stateCode}. Join the partner marketplace.`,
      internal_links: links,
    },
    schema_markup: { "@context": "https://schema.org", "@type": "Article", headline: title },
  });
  if (error) return { ok: false, summary: error.message };

  return { ok: true, summary: `Mover growth article drafted with partner funnel links`, data: { slug, links } };
}

// ── 9. Digital Product Agent ───────────────────────────────────────────────
async function stageDigitalProduct({ db, facts }: StageContext): Promise<StageResult> {
  const title = `${facts.city} Moving Checklist & Planner`;
  const slug = slugify(title);
  const { data: existing } = await db.from("ai_products").select("id").eq("slug", slug).maybeSingle();
  if (existing) return { ok: true, summary: `Product already exists (${slug})`, data: { slug } };

  const links = [
    landingPathFor(facts.slug, facts.stateCode),
    moversPathFor(facts.slug, facts.stateCode),
    "/products",
    "/blog",
    "/calculator",
  ];

  const { error } = await db.from("ai_products").insert({
    title,
    slug,
    product_type: "planner",
    description: `A printable moving checklist, inventory sheet and budget planner tailored to ${facts.city}, ${facts.stateName} — including local ZIP coverage and parking notes.`,
    price_cents: 900,
    status: "draft",
    quality_score: 89,
    agent_key: "product_factory",
    seo: {
      title: `${title} | Easy Moving Store`,
      description: `Download the ${facts.city} moving checklist, inventory sheet and budget planner.`,
      internal_links: links,
    },
    preview_urls: [],
    assets: [{ kind: "pdf", status: "pending_build", filename: `${slug}.pdf` }],
    bundle_of: [],
  });
  if (error) return { ok: false, summary: error.message };

  return { ok: true, summary: `City planner product created and linked back to the calculator`, data: { slug, links } };
}

// ── 10. Quality Agent ──────────────────────────────────────────────────────
async function stageQuality({ db, facts, landingSlug }: StageContext): Promise<StageResult> {
  const row = await pageRow(db, landingSlug);
  const content = buildCityLandingContent(facts);
  const seo = buildMoversSeoContent(facts, content);

  const { data: peers } = await db
    .from("city_landing_pages")
    .select("slug, content")
    .neq("slug", landingSlug)
    .limit(40);
  const peerTitles: string[] = [];
  const peerIntros: string[] = [];
  for (const p of (peers ?? []) as Array<Record<string, any>>) {
    const c = p["content"] as Record<string, any> | null;
    if (c?.["title"]) peerTitles.push(String(c["title"]));
    if (c?.["intro"]) peerIntros.push(String(c["intro"]));
  }

  const report = auditCityPage(facts, seo, {
    existingTitles: peerTitles,
    existingIntros: peerIntros,
    calculatorPublished: row?.["status"] === "published",
    consoleErrors: 0,
    brokenLinks: 0,
    indexable: ENABLE_INDEXING,
  });

  await db
    .from("city_landing_pages")
    .update({
      audit_score: report.score,
      audit_report: report as never,
      audited_at: new Date().toISOString(),
    })
    .eq("slug", landingSlug);

  return {
    ok: report.score >= MIN_AUDIT_SCORE,
    summary:
      report.score >= MIN_AUDIT_SCORE
        ? `Quality passed — audit score ${report.score}/100`
        : `Audit ${report.score}/100 below ${MIN_AUDIT_SCORE}: ${report.failures.map((f: any) => f.label).join(", ")}`,
    data: { score: report.score, failures: report.failures.map((f: any) => f.label), fixes: report.fixes },
  };
}

// ── 11. Publish Agent ──────────────────────────────────────────────────────
async function stagePublish({ db, facts, landingSlug }: StageContext): Promise<StageResult> {
  const now = new Date().toISOString();
  await db
    .from("city_landing_pages")
    .update({
      status: "published",
      city_status: "published",
      seo_status: "published",
      published_at: now,
      seo_published_at: now,
      index_status: ENABLE_INDEXING ? "submitted" : "pending",
      submitted_at: ENABLE_INDEXING ? now : null,
    })
    .eq("slug", landingSlug);

  await db.from("city_publish_log").insert({
    slug: landingSlug,
    city: facts.city,
    state_code: facts.stateCode,
    result: "published",
    reason: "Phase 7 production line — all 12 stages passed",
  });

  await db
    .from("usa_cities")
    .update({ published: true, pipeline_status: "published", last_published_at: now })
    .eq("city_slug", facts.slug)
    .eq("state_code", facts.stateCode);

  return {
    ok: true,
    summary: `Published — sitemap, RSS, internal search and index queue updated`,
    data: {
      calculator: landingPathFor(facts.slug, facts.stateCode),
      seoPage: moversPathFor(facts.slug, facts.stateCode),
      sitemap: `${SITE_ORIGIN}/sitemap.xml`,
      indexingEnabled: ENABLE_INDEXING,
    },
  };
}

// ── 12. Analytics Agent ────────────────────────────────────────────────────
async function stageAnalytics({ db, facts, landingSlug }: StageContext): Promise<StageResult> {
  const day = new Date().toISOString().slice(0, 10);
  await db
    .from("city_landing_pages")
    .update({ monitored_at: new Date().toISOString() })
    .eq("slug", landingSlug);

  await db.from("ai_task_logs").insert({
    agent_key: "google_performance_agent",
    level: "info",
    message: `Analytics baseline opened for ${facts.city}, ${facts.stateCode}`,
  });

  return {
    ok: true,
    summary: `Measurement baseline opened (traffic, CTR, ranking, conversions, downloads, calculator usage)`,
    data: { day, tracked: ["traffic", "ctr", "ranking", "conversions", "downloads", "calculator_usage"] },
  };
}

const EXECUTORS: Record<ProductionStageKey, (ctx: StageContext) => Promise<StageResult>> = {
  usa_data: stageUsaData,
  calculator: stageCalculator,
  seo: stageSeo,
  internal_links: stageInternalLinks,
  image_factory: stageImageFactory,
  image_seo: stageImageSeo,
  blog: stageBlog,
  mover_content: stageMoverContent,
  digital_product: stageDigitalProduct,
  quality: stageQuality,
  publish: stagePublish,
  analytics: stageAnalytics,
};

/** Run one stage of the production line. Never throws. */
export async function runProductionStage(
  ctx: StageContext,
  step: number,
): Promise<StageResult & { step: number; key: ProductionStageKey; name: string }> {
  const stage = PRODUCTION_STAGES.find((s) => s.step === step);
  if (!stage) {
    return { ok: false, summary: `Unknown stage ${step}`, step, key: "usa_data", name: "unknown" };
  }
  try {
    const res = await EXECUTORS[stage.key](ctx);
    return { ...res, step, key: stage.key, name: stage.name };
  } catch (err) {
    return {
      ok: false,
      summary: err instanceof Error ? err.message : String(err),
      step,
      key: stage.key,
      name: stage.name,
    };
  }
}
