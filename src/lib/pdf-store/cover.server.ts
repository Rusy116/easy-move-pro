/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 14 — Cover Image Agent (server-only).
//
// Generates a real, on-brand cover image for a product, stores it in the
// private `pdf-covers` bucket and returns the public delivery path served by
// /api/public/pdf-cover/<slug>.png. Any failure degrades silently to the
// deterministic SVG CoverArt already used by the storefront.
// ---------------------------------------------------------------------------
import { resolveCoverSpec, type CoverSpec } from "./catalog";

const IMAGE_MODEL = "google/gemini-3-pro-image";
export const COVER_BUCKET = "pdf-covers";

export function coverPublicPath(slug: string) {
  return `/api/public/pdf-cover/${slug}.png`;
}

/** Build the art direction prompt from the cover spec the design agent chose. */
export function coverPrompt(title: string, category: string, spec: CoverSpec) {
  const [base, accent] = spec.palette ?? ["#0f3d3e", "#7cc4b0"];
  return [
    `Editorial book-cover artwork for a printable PDF titled "${title}" (category: ${category}) sold by a US moving marketplace.`,
    `Flat vector illustration, generous negative space, portrait 3:4 aspect ratio (taller than wide), print-ready, high quality.`,
    `Strict two-colour palette: deep base ${base} with ${accent} accents, plus paper white.`,
    `Central motif: stylised ${spec.motif ?? "boxes"}. Layout style: ${spec.layout ?? "stack"}.`,
    `No text, no letters, no numbers, no logos, no watermarks, no photographic elements.`,
  ].join(" ");
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

/** One gateway call. Throws on any failure so the caller can retry. */
async function generateOnce(prompt: string): Promise<Uint8Array> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`image gateway ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.find((d) => d?.b64_json)?.b64_json;
  if (!b64) throw new Error("gateway returned no image payload");

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.length < 2048 || PNG_MAGIC.some((b, i) => bytes[i] !== b)) {
    throw new Error("gateway returned a corrupt or empty PNG");
  }
  return bytes;
}

/** Generate with automatic retries + backoff. Returns the error text on failure. */
async function generatePng(prompt: string): Promise<{ png: Uint8Array | null; error: string | null }> {
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return { png: await generateOnce(prompt), error: null };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[pdf-cover] attempt ${attempt}/3 failed:`, lastError);
      // 4xx other than 429 are terminal — retrying returns the same error.
      if (/gateway 4(?!29)\d\d/.test(lastError)) break;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  return { png: null, error: lastError };
}

export interface CoverResult {
  ok: boolean;
  cover_url: string | null;
  cover_status: "generated" | "fallback";
  prompt: string;
  error: string | null;
}

/** Generate + store one product cover. Never throws. */
export async function generateCover(
  db: any,
  product: { slug: string; title: string; category_slug: string; cover_spec?: CoverSpec | null },
): Promise<CoverResult> {
  const spec = resolveCoverSpec(product.slug, product.cover_spec ?? null);
  const prompt = coverPrompt(product.title, product.category_slug, spec);
  const { png, error } = await generatePng(prompt);

  if (!png) return { ok: false, cover_url: null, cover_status: "fallback", prompt, error };

  const path = `${product.slug}.png`;
  const { error: uploadError } = await db.storage
    .from(COVER_BUCKET)
    .upload(path, png, { contentType: "image/png", upsert: true });

  if (uploadError) {
    console.error("[pdf-cover] upload failed:", uploadError.message);
    return { ok: false, cover_url: null, cover_status: "fallback", prompt, error: `upload: ${uploadError.message}` };
  }

  return { ok: true, cover_url: coverPublicPath(product.slug), cover_status: "generated", prompt, error: null };
}

/**
 * Backfill covers for products that still render the SVG fallback, plus any
 * product whose cover_url no longer matches its slug (the repair agent renames
 * slugs, which orphans the previously uploaded file).
 */
export async function backfillCovers(db: any, limit: number) {
  const { data } = await db
    .from("pdf_products")
    .select("slug,title,category_slug,cover_spec,cover_url,cover_status")
    .neq("status", "archived")
    .limit(500);

  const rows = ((data ?? []) as any[])
    .filter((p) => !p.cover_url || p.cover_url !== coverPublicPath(p.slug))
    .slice(0, limit);

  let generated = 0;
  let failed = 0;

  for (const p of rows) {
    const result = await generateCover(db, p);
    await db
      .from("pdf_products")
      .update({
        cover_url: result.cover_url,
        cover_status: result.cover_status,
        cover_prompt: result.prompt,
      })
      .eq("slug", p.slug);

    if (result.ok) generated += 1;
    else failed += 1;

    await db.from("pdf_publish_log").insert({
      product_slug: p.slug,
      action: result.ok ? "cover" : "cover_failed",
      detail: result.ok ? "Cover image generated" : `Cover generation failed: ${result.error ?? "unknown"}`,
    });
  }

  return { attempted: rows.length, generated, failed };
}

