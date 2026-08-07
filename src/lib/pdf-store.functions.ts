/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 13 — Digital PDF Store (server functions).
//
// Public reads go through the publishable key (anon SELECT on published rows
// only). Customer actions (favorites, recently viewed, unlock, downloads) run
// through requireSupabaseAuth so RLS scopes them to the signed-in user.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PdfCategory, PdfProduct } from "./pdf-store/catalog";

const LIST_COLUMNS =
  "slug,title,subtitle,category_slug,collection_slug,tags,difficulty,language,version,page_count,price_cents,compare_at_cents,quality_score,seo_score,cover_spec,cover_url,alt_text,is_featured,is_bestseller,downloads,views,published_at,status,description";

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init?: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Storefront home payload: categories + curated shelves. */
export const storefront = createServerFn({ method: "GET" }).handler(async () => {
  const db = await publicClient();
  const [cats, products] = await Promise.all([
    db.from("pdf_categories").select("*").order("sort_order"),
    db
      .from("pdf_products")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(120),
  ]);
  const all = (products.data ?? []) as unknown as PdfProduct[];
  return {
    categories: (cats.data ?? []) as unknown as PdfCategory[],
    featured: all.filter((p) => p.is_featured).slice(0, 6),
    bestsellers: [...all].sort((a, b) => b.downloads - a.downloads).slice(0, 8),
    newest: all.slice(0, 8),
    total: all.length,
  };
});

/** Category / search / collection listing. */
export const listStoreProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string; q?: string; sort?: string; limit?: number } | undefined) => ({
    category: d?.category ? String(d.category).slice(0, 64) : undefined,
    q: d?.q ? String(d.q).slice(0, 80) : undefined,
    sort: d?.sort ?? "newest",
    limit: Math.min(Math.max(Number(d?.limit ?? 48), 1), 200),
  }))
  .handler(async ({ data }) => {
    const db = await publicClient();
    let query = db.from("pdf_products").select(LIST_COLUMNS).eq("status", "published");
    if (data.category) query = query.eq("category_slug", data.category);
    if (data.q) query = query.or(`title.ilike.%${data.q}%,description.ilike.%${data.q}%`);
    if (data.sort === "popular") query = query.order("downloads", { ascending: false });
    else if (data.sort === "price") query = query.order("price_cents", { ascending: true });
    else query = query.order("published_at", { ascending: false });
    const { data: rows } = await query.limit(data.limit);
    return (rows ?? []) as unknown as PdfProduct[];
  });

export const storeCategories = createServerFn({ method: "GET" }).handler(async () => {
  const db = await publicClient();
  const { data } = await db.from("pdf_categories").select("*").order("sort_order");
  return (data ?? []) as unknown as PdfCategory[];
});

/** Full product detail + related shelf. */
export const getStoreProduct = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug).slice(0, 100) }))
  .handler(async ({ data }) => {
    const db = await publicClient();
    const { data: product } = await db
      .from("pdf_products")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!product) return null;
    const p = product as unknown as PdfProduct;
    const [{ data: related }, { data: reviews }] = await Promise.all([
      db
        .from("pdf_products")
        .select(LIST_COLUMNS)
        .eq("status", "published")
        .eq("category_slug", p.category_slug)
        .neq("slug", p.slug)
        .limit(4),
      db
        .from("pdf_reviews")
        .select("id,rating,title,body,created_at")
        .eq("product_slug", data.slug)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    return {
      product: p,
      related: (related ?? []) as unknown as PdfProduct[],
      reviews: (reviews ?? []) as unknown as Array<{
        id: string;
        rating: number;
        title: string | null;
        body: string | null;
        created_at: string;
      }>,
    };
  });

/** Customer review submission. RLS scopes the row to the signed-in user. */
export const submitProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; rating: number; title?: string; body?: string }) => ({
    slug: String(d.slug).slice(0, 100),
    rating: Math.min(Math.max(Math.round(Number(d.rating)), 1), 5),
    title: d.title ? String(d.title).slice(0, 120) : null,
    body: d.body ? String(d.body).slice(0, 2000) : null,
  }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { error } = await db.from("pdf_reviews").upsert(
      {
        user_id: context.userId,
        product_slug: data.slug,
        rating: data.rating,
        title: data.title,
        body: data.body,
        status: "approved",
      },
      { onConflict: "user_id,product_slug" },
    );
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncRatings } = await import("./pdf-store/research.server");
    await syncRatings(supabaseAdmin as any, [data.slug]);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/*                        Customer-side actions                        */
/* ------------------------------------------------------------------ */

/** Everything the customer library needs in one round trip. */
export const myLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const [purchases, favorites, recent, downloads] = await Promise.all([
      db.from("customer_purchases").select("*").order("purchased_at", { ascending: false }),
      db.from("pdf_favorites").select("product_slug,created_at").order("created_at", { ascending: false }),
      db.from("pdf_recent_views").select("product_slug,viewed_at").order("viewed_at", { ascending: false }).limit(12),
      db.from("pdf_downloads").select("*").order("downloaded_at", { ascending: false }).limit(50),
    ]);

    const slugs = Array.from(
      new Set(
        [
          ...((purchases.data ?? []) as any[]).map((r) => r.product_slug),
          ...((favorites.data ?? []) as any[]).map((r) => r.product_slug),
          ...((recent.data ?? []) as any[]).map((r) => r.product_slug),
        ].filter(Boolean),
      ),
    );
    const products = slugs.length
      ? ((await db.from("pdf_products").select("*").in("slug", slugs)).data ?? [])
      : [];

    return {
      purchases: (purchases.data ?? []) as any[],
      favorites: ((favorites.data ?? []) as any[]).map((r) => r.product_slug as string),
      recent: ((recent.data ?? []) as any[]).map((r) => r.product_slug as string),
      downloads: (downloads.data ?? []) as any[],
      products: products as PdfProduct[],
    };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug).slice(0, 100) }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: existing } = await db
      .from("pdf_favorites")
      .select("id")
      .eq("product_slug", data.slug)
      .maybeSingle();
    if (existing) {
      await db.from("pdf_favorites").delete().eq("id", existing.id);
      return { favorited: false };
    }
    await db.from("pdf_favorites").insert({ user_id: context.userId, product_slug: data.slug });
    return { favorited: true };
  });

export const trackView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug).slice(0, 100) }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    await db
      .from("pdf_recent_views")
      .upsert(
        { user_id: context.userId, product_slug: data.slug, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,product_slug" },
      );
    return { ok: true };
  });

/**
 * Unlock a product for the signed-in customer and return the full record so
 * the browser can render and save the PDF. Paid products route through the
 * checkout seam in pdf-store/checkout.ts once payments are enabled.
 */
export const claimProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug).slice(0, 100) }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: product } = await db
      .from("pdf_products")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!product) throw new Error("Product not available");

    const { data: owned } = await db
      .from("customer_purchases")
      .select("id")
      .eq("product_slug", data.slug)
      .maybeSingle();

    if (!owned) {
      await db.from("customer_purchases").insert({
        user_id: context.userId,
        product_slug: data.slug,
        title: product.title,
        version: product.version,
        amount_cents: product.price_cents,
        currency: "usd",
        status: "completed",
      });
    }

    await db.from("pdf_downloads").insert({
      user_id: context.userId,
      product_slug: data.slug,
      version: product.version,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("pdf_products")
      .update({
        downloads: Number(product.downloads ?? 0) + 1,
        revenue_cents: Number(product.revenue_cents ?? 0) + (owned ? 0 : Number(product.price_cents ?? 0)),
      })
      .eq("slug", data.slug);

    return { product: product as PdfProduct, alreadyOwned: !!owned };
  });
