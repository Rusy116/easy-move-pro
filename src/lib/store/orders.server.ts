// ---------------------------------------------------------------------------
// Digital store — server-only order helpers.
//
// Owns: order numbers, secure download tokens, order lookups and fulfilment.
// Never imported from client code (filename is *.server.ts).
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

/** 30 days — a guest can re-download for a month, then must sign in. */
export const DOWNLOAD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

/** Signs an order-scoped, time-limited download token. */
export async function signDownloadToken(
  orderId: string,
  slug: string,
  ttlMs = DOWNLOAD_TTL_MS,
): Promise<string> {
  const claim: DownloadClaim = { o: orderId, s: slug, e: Date.now() + ttlMs };
  const payload = b64url(encoder.encode(JSON.stringify(claim)));
  return `${payload}.${await hmac(payload)}`;
}

/** Verifies a download token. Returns null for tampered or expired tokens. */
export async function verifyDownloadToken(token: string): Promise<DownloadClaim | null> {
  const [payload, signature] = String(token ?? "").split(".");
  if (!payload || !signature) return null;
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
