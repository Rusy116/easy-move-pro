// ---------------------------------------------------------------------------
// SAFETY HARDENING — cron-to-server authentication for the AI factory ticks.
//
// The factory tick endpoints can start PAID AI work, so they must not be
// callable with the publishable/anon key (which ships to every browser).
// They now require a dedicated server-only shared secret:
//
//     FACTORY_TICK_SECRET
//
// Rules enforced here:
//   * server-only — never read from import.meta.env / VITE_*, never returned
//   * never logged, never echoed in a response
//   * fails CLOSED: if the secret is not configured the endpoint refuses
//   * constant-time comparison
// ---------------------------------------------------------------------------

/** Constant-time string compare (no early exit on first differing byte). */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Compare a fixed number of bytes so length alone does not short-circuit.
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export interface TickAuthFailure {
  response: Response;
}

/**
 * Verify a scheduled factory tick request.
 *
 * Returns `null` when the caller is authorized, otherwise a ready-to-return
 * error Response. Must be called BEFORE any worker module is imported or any
 * job is claimed.
 */
export function verifyFactoryTick(request: Request): TickAuthFailure | null {
  const expected = process.env["FACTORY_TICK_SECRET"] ?? "";

  if (!expected) {
    // Fail closed — an unconfigured secret must never mean "open".
    console.error("[factory-tick] refused: FACTORY_TICK_SECRET is not configured");
    return {
      response: Response.json(
        { error: "Factory tick secret not configured" },
        { status: 503 },
      ),
    };
  }

  const provided =
    request.headers.get("x-factory-tick-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (!provided || !timingSafeEqual(provided, expected)) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return null;
}
