/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 14 — Catalog repair agent (server-only).
//
// Brings the existing catalog up to commercial standard without touching the
// production pipeline: clean names, real prices, complete categories and a
// balanced backlog. Idempotent — safe to run on every worker tick.
// ---------------------------------------------------------------------------
import { FALLBACK_CATEGORIES, slugify, type PdfSection } from "./catalog";
import { cleanTitle, needsRename, uniqueTitle } from "./naming";
import { priceProduct } from "./pricing";

/** Every category row exists and is ordered, so the store never shows a gap. */
export async function ensureCategories(db: any) {
  const { data } = await db.from("pdf_categories").select("slug");
  const have = new Set(((data ?? []) as any[]).map((r) => r.slug as string));
  const missing = FALLBACK_CATEGORIES.filter((c) => !have.has(c.slug));
  if (missing.length) await db.from("pdf_categories").insert(missing);
  return missing.length;
}

/** Rewrite legacy stuttering titles ("The Moving Moving Kit"). Slugs are kept. */
export async function repairNames(db: any, limit = 200) {
  const { data } = await db.from("pdf_products").select("slug,title,seo_title,category_slug").limit(limit);
  const rows = (data ?? []) as any[];
  const taken = new Set<string>(rows.map((r) => slugify(r.title)));
  let renamed = 0;

  for (const p of rows) {
    if (!needsRename(p.title)) continue;
    taken.delete(slugify(p.title));
    const title = uniqueTitle(cleanTitle(p.title), taken);
    if (title === p.title) continue;
    await db
      .from("pdf_products")
      .update({
        title,
        seo_title: `${title} — Printable PDF`.slice(0, 60),
        alt_text: `${title} — printable moving PDF cover from Easy Moving`,
      })
      .eq("slug", p.slug);
    await db.from("pdf_jobs").update({ title }).eq("product_slug", p.slug);
    await db.from("pdf_publish_log").insert({ product_slug: p.slug, action: "renamed", detail: title });
    renamed += 1;
  }
  return renamed;
}

/** Apply the commercial pricing model to anything still sitting at $0. */
export async function repairPricing(db: any, limit = 300) {
  const { data } = await db
    .from("pdf_products")
    .select("slug,category_slug,page_count,content,quality_score,price_cents,is_bundle,bundle_slugs,is_lead_magnet")
    .neq("status", "archived")
    .limit(limit);

  const rows = (data ?? []) as any[];
  let repriced = 0;

  for (const p of rows) {
    if (p.is_lead_magnet) continue;
    if (Number(p.price_cents ?? 0) > 0) continue;
    const items = ((p.content ?? []) as PdfSection[]).reduce((n, s) => n + (s.items?.length ?? 0), 0);
    const decision = priceProduct({
      category_slug: p.category_slug,
      page_count: p.page_count,
      checklist_items: items,
      quality_score: p.quality_score,
      is_bundle: p.is_bundle,
      bundle_count: (p.bundle_slugs ?? []).length,
    });
    await db
      .from("pdf_products")
      .update({
        price_cents: decision.price_cents,
        compare_at_cents: decision.compare_at_cents,
        price_tier: decision.price_tier,
      })
      .eq("slug", p.slug);
    repriced += 1;
  }
  return repriced;
}

/**
 * Category completion — every category needs a healthy shelf. Any category
 * below `minPerCategory` published products gets fresh backlog ideas.
 */
export async function fillCategoryGaps(db: any, minPerCategory = 4) {
  const [{ data: products }, { data: opps }] = await Promise.all([
    db.from("pdf_products").select("slug,title,category_slug,status"),
    db.from("pdf_opportunities").select("title,category_slug,status"),
  ]);

  const rows = (products ?? []) as any[];
  const backlog = (opps ?? []) as any[];
  const taken = new Set<string>([
    ...rows.map((r) => r.slug as string),
    ...rows.map((r) => slugify(r.title)),
    ...backlog.map((r) => slugify(r.title)),
  ]);

  const ANGLES: Record<string, string[]> = {
    checklists: ["Change of Address Master Checklist", "Apartment Move-Out Inspection Checklist", "Utility Transfer Checklist", "First Week in Your New Home Checklist"],
    planners: ["8-Week Move Planner", "Moving Day Hour-by-Hour Schedule", "Long-Distance Relocation Planner", "Closing & Handover Planner"],
    budget: ["Moving Cost Estimator Worksheet", "DIY vs Professional Movers Comparison", "Deposit & Fee Tracker", "Relocation Expense Reimbursement Log"],
    inventory: ["Room-by-Room Inventory Sheet", "High-Value Item Photo Log", "Box Label & Room Tag Sheets", "Storage Unit Inventory Tracker"],
    packing: ["Fragile & Valuables Packing Guide", "Kitchen Packing Playbook", "Wardrobe & Linen Packing Guide", "Essentials Box Contents Sheet"],
    family: ["Moving With Toddlers Survival Kit", "Moving With Pets Preparation Guide", "Senior Downsizing Workbook", "School Transfer Document Checklist"],
    business: ["Office Relocation Project Plan", "IT & Server Move Runbook", "Employee Relocation Communication Pack", "Retail Store Move Checklist"],
    movers: ["Crew Job Sheet & Route Card", "Bill of Lading Template Pack", "Damage Claim Intake Form", "Truck Load Plan Worksheet"],
  };

  const inserts: any[] = [];
  for (const cat of FALLBACK_CATEGORIES) {
    const published = rows.filter((r) => r.category_slug === cat.slug && r.status === "published").length;
    const queued = backlog.filter((r) => r.category_slug === cat.slug && r.status === "new").length;
    const need = minPerCategory - published - queued;
    if (need <= 0) continue;
    for (const angle of (ANGLES[cat.slug] ?? []).slice(0, need)) {
      const title = uniqueTitle(angle, taken);
      inserts.push({
        keyword: angle.toLowerCase(),
        title,
        category_slug: cat.slug,
        demand_score: 62,
        difficulty_score: 28,
        priority: 78,
        gap_reason: `Category coverage gap in ${cat.name}`,
        source: "category-completion",
      });
    }
  }

  if (inserts.length) await db.from("pdf_opportunities").insert(inserts);
  return inserts.length;
}

export interface RepairReport {
  categoriesAdded: number;
  renamed: number;
  repriced: number;
  backlogAdded: number;
}

export async function repairCatalog(db: any): Promise<RepairReport> {
  const categoriesAdded = await ensureCategories(db);
  const renamed = await repairNames(db);
  const repriced = await repairPricing(db);
  const backlogAdded = await fillCategoryGaps(db);
  return { categoriesAdded, renamed, repriced, backlogAdded };
}
