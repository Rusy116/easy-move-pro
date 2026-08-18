// ---------------------------------------------------------------------------
// Digital store — server-only order helpers.
//
// Owns: order numbers, secure download tokens, order lookups and fulfilment.
// Never imported from client code (filename is *.server.ts).
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

/**
 * 30 days per emailed link. Access itself is permanent: a fresh link can
 * always be re-issued from /orders (by email) or the account library.
 */
export const DOWNLOAD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Receipts stay reachable for a year from the emailed/confirmation link. */
export const RECEIPT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function signingSecret(): string {
  const secret =
    process.env["DOWNLOAD_SIGNING_SECRET"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("DOWNLOAD_SIGNING_SECRET is not configured");
  return secret;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return b64url(new Uint8Array(sig));
}

export interface DownloadClaim {
  /** order id */
  o: string;
  /** product slug */
  s: string;
  /** expiry (ms epoch) */
  e: number;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Signs an order-scoped, time-limited download token and records it so the
 * link keeps working even if the HMAC secret differs between environments.
 */
export async function signDownloadToken(
  orderId: string,
  slug: string,
  ttlMs = DOWNLOAD_TTL_MS,
): Promise<string> {
  const expiresAt = Date.now() + ttlMs;
  const claim: DownloadClaim = { o: orderId, s: slug, e: expiresAt };
  const payload = b64url(encoder.encode(JSON.stringify(claim)));
  const token = `${payload}.${await hmac(payload)}`;

  // Persisted so verification never depends on a per-environment secret.
  try {
    const db = await admin();
    await db.from("store_download_tokens").upsert(
      {
        token_hash: await sha256Hex(token),
        order_id: orderId,
        product_slug: slug,
        expires_at: new Date(expiresAt).toISOString(),
      },
      { onConflict: "token_hash" },
    );
  } catch (error) {
    console.error("[orders] could not persist download token:", error);
  }

  return token;
}

/** Verifies a download token. Returns null for tampered or expired tokens. */
export async function verifyDownloadToken(token: string): Promise<DownloadClaim | null> {
  const raw = String(token ?? "").trim();
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  // 1) Stored token (authoritative, environment-independent).
  try {
    const db = await admin();
    const { data: row } = await db
      .from("store_download_tokens")
      .select("order_id,product_slug,expires_at,revoked_at")
      .eq("token_hash", await sha256Hex(raw))
      .maybeSingle();
    if (row && !row.revoked_at) {
      const expiry = new Date(row.expires_at).getTime();
      if (Date.now() <= expiry) {
        return { o: row.order_id, s: row.product_slug, e: expiry };
      }
      return null;
    }
  } catch (error) {
    console.error("[orders] download token lookup failed:", error);
  }

  // 2) Legacy/unstored tokens: fall back to HMAC verification.
  const expected = await hmac(payload);
  if (expected.length !== signature.length) return null;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return null;
  try {
    const claim = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as DownloadClaim;
    if (!claim?.o || !claim?.s || !claim?.e) return null;
    if (Date.now() > Number(claim.e)) return null;
    return claim;
  } catch {
    return null;
  }
}


/** EM-PDF-YYYY-XXXXXX */
export function newOrderNumber(): string {
  const year = new Date().getUTCFullYear();
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `EM-PDF-${year}-${rand}`;
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export function siteOrigin(): string {
  return (
    process.env["PUBLIC_SITE_ORIGIN"] ??
    "https://easymove.pro"
  );
}

export interface ReceiptClaim {
  /** order id */
  o: string;
  /** token kind */
  k: "receipt";
  /** expiry (ms epoch) */
  e: number;
}

/** Signs a read-only receipt token for one order. */
export async function signReceiptToken(orderId: string, ttlMs = RECEIPT_TTL_MS): Promise<string> {
  const claim: ReceiptClaim = { o: orderId, k: "receipt", e: Date.now() + ttlMs };
  const payload = b64url(encoder.encode(JSON.stringify(claim)));
  return `${payload}.${await hmac(payload)}`;
}

/** Verifies a receipt token. Returns null when tampered, expired or wrong kind. */
export async function verifyReceiptToken(token: string): Promise<ReceiptClaim | null> {
  const [payload, signature] = String(token ?? "").split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload);
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return null;
  try {
    const claim = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as ReceiptClaim;
    if (claim?.k !== "receipt" || !claim?.o || !claim?.e) return null;
    if (Date.now() > Number(claim.e)) return null;
    return claim;
  } catch {
    return null;
  }
}
