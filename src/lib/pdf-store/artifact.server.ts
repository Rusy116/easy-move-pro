/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PF-1 — Pre-publish PDF artifact generation + deliverability verification.
//
// Reuses the EXISTING renderer (buildProductPdf / jsPDF). No second rendering
// engine. The artifact is stored in the private `pdf-artifacts` bucket and
// must be read back and validated before a product may be published.
// ---------------------------------------------------------------------------
import { buildProductPdf } from "./render-pdf";
import type { PdfProduct } from "./catalog";

export const ARTIFACT_BUCKET = "pdf-artifacts";
/** Minimum plausible size for a real multi-page product PDF. */
export const MIN_ARTIFACT_BYTES = 2048;

export function artifactPath(slug: string, version: string | null | undefined) {
  return `products/${slug}/product-v${version || "1.0"}.pdf`;
}

export function isPdfPayload(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d //   -
  );
}

export interface ArtifactResult {
  ready: boolean;
  verified: boolean;
  path: string | null;
  bytes: number;
  verifiedAt: string | null;
  error: string | null;
}

function fail(path: string | null, error: string): ArtifactResult {
  return { ready: false, verified: false, path, bytes: 0, verifiedAt: null, error };
}

/**
 * Render → upload → read back → validate. Never throws; any failure returns
 * ready/verified false and the real error so the publish gate can block.
 */
export async function generateAndVerifyArtifact(
  db: any,
  product: PdfProduct | any,
): Promise<ArtifactResult> {
  const path = artifactPath(product.slug, product.version);

  // 1 — render with the existing engine.
  let bytes: Uint8Array;
  try {
    const doc = buildProductPdf(product as PdfProduct);
    bytes = new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
  } catch (err) {
    return fail(path, `render failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!bytes.length) return fail(path, "render produced an empty file");
  if (!isPdfPayload(bytes)) return fail(path, "render did not produce a PDF payload");
  if (bytes.length < MIN_ARTIFACT_BYTES) return fail(path, `rendered file too small (${bytes.length} bytes)`);

  // 2 — store it.
  const { error: uploadError } = await db.storage
    .from(ARTIFACT_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (uploadError) return fail(path, `upload failed: ${uploadError.message ?? "unknown"}`);

  // 3 — read it back from storage and validate the stored payload.
  const { data: blob, error: downloadError } = await db.storage.from(ARTIFACT_BUCKET).download(path);
  if (downloadError || !blob) {
    return fail(path, `retrieval failed: ${downloadError?.message ?? "no payload returned"}`);
  }
  let stored: Uint8Array;
  try {
    stored = new Uint8Array(await blob.arrayBuffer());
  } catch (err) {
    return fail(path, `retrieval unreadable: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!stored.length) return fail(path, "stored artifact is empty");
  if (!isPdfPayload(stored)) return fail(path, "stored artifact is not a PDF (HTML/error payload?)");
  if (stored.length < MIN_ARTIFACT_BYTES) return fail(path, `stored artifact too small (${stored.length} bytes)`);
  if (stored.length !== bytes.length) {
    return fail(path, `stored artifact size mismatch (${stored.length} vs ${bytes.length})`);
  }

  return {
    ready: true,
    verified: true,
    path,
    bytes: stored.length,
    verifiedAt: new Date().toISOString(),
    error: null,
  };
}

/** Short-lived signed URL for a verified stored artifact. Null when absent. */
export async function signedArtifactUrl(db: any, filePath: string | null, seconds = 300) {
  if (!filePath || !filePath.startsWith("products/")) return null;
  const { data, error } = await db.storage.from(ARTIFACT_BUCKET).createSignedUrl(filePath, seconds);
  if (error) return null;
  return (data?.signedUrl as string | undefined) ?? null;
}
