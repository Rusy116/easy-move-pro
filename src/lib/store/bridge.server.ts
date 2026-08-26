// ---------------------------------------------------------------------------
// Store bridge — server-to-server HMAC transport (SERVER ONLY).
//
// Vercel hosts the public frontend but has no access to the Lovable-managed
// service-role credential. Privileged checkout therefore runs inside Lovable
// Cloud, reached over an authenticated server-to-server call.
//
// BRIDGE_SHARED_SECRET is server-only on BOTH sides and is never logged,
// returned or exposed to browser code.
// ---------------------------------------------------------------------------

/** Maximum accepted clock skew between the two deployments. */
export const BRIDGE_MAX_SKEW_MS = 300_000;

export const BRIDGE_HEADERS = {
  timestamp: "x-bridge-timestamp",
  nonce: "x-bridge-nonce",
  signature: "x-bridge-signature",
  buyerToken: "x-buyer-token",
} as const;

function bridgeSecret(): string {
  return process.env["BRIDGE_SHARED_SECRET"] ?? "";
}

/** Configured bridge base URL, without a trailing slash. Empty when unset. */
export function bridgeBaseUrl(): string {
  return (process.env["STORE_BRIDGE_URL"] ?? "").trim().replace(/\/+$/, "");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

/** Constant-time string comparison (both values are hex digests). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function bridgeSignaturePayload(timestamp: string, nonce: string, rawBody: string): string {
  return `${timestamp}.${nonce}.${rawBody}`;
}

/** Builds the signed headers for one outbound bridge request. */
export async function signBridgeRequest(rawBody: string): Promise<Record<string, string>> {
  const secret = bridgeSecret();
  if (!secret) throw new Error("BRIDGE_SHARED_SECRET is not configured");
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const signature = await hmacHex(secret, bridgeSignaturePayload(timestamp, nonce, rawBody));
  return {
    "content-type": "application/json",
    [BRIDGE_HEADERS.timestamp]: timestamp,
    [BRIDGE_HEADERS.nonce]: nonce,
    [BRIDGE_HEADERS.signature]: signature,
  };
}

export type BridgeVerification =
  | { ok: true; rawBody: string }
  | { ok: false; status: number; reason: string };

/**
 * Verifies an inbound bridge request. Returns the raw body so the caller can
 * parse and validate it — the signature covers the exact bytes received.
 */
export async function verifyBridgeRequest(request: Request): Promise<BridgeVerification> {
  const secret = bridgeSecret();
  if (!secret) return { ok: false, status: 503, reason: "bridge_not_configured" };

  const timestamp = request.headers.get(BRIDGE_HEADERS.timestamp) ?? "";
  const nonce = request.headers.get(BRIDGE_HEADERS.nonce) ?? "";
  const signature = (request.headers.get(BRIDGE_HEADERS.signature) ?? "").toLowerCase();
  if (!timestamp || !nonce || !signature) {
    return { ok: false, status: 401, reason: "missing_auth_headers" };
  }
  if (!/^[0-9a-f]{64}$/.test(signature)) {
    return { ok: false, status: 401, reason: "malformed_signature" };
  }

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > BRIDGE_MAX_SKEW_MS) {
    return { ok: false, status: 401, reason: "timestamp_out_of_window" };
  }
  if (nonce.length < 8 || nonce.length > 128) {
    return { ok: false, status: 401, reason: "invalid_nonce" };
  }

  const rawBody = await request.text();
  const expected = await hmacHex(secret, bridgeSignaturePayload(timestamp, nonce, rawBody));
  if (!timingSafeEqual(expected, signature)) {
    return { ok: false, status: 401, reason: "invalid_signature" };
  }
  return { ok: true, rawBody };
}
