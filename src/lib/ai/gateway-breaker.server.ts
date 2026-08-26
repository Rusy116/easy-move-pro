// ---------------------------------------------------------------------------
// SAFETY HARDENING — AI provider circuit breaker.
//
// The factories call the Lovable AI Gateway once per stage. A provider-side
// payment / permission / quota failure (402, 403, 429) is NOT transient in the
// way a 500 is: retrying it every minute burns budget and rate limit for no
// output. This breaker bounds that.
//
// Behaviour:
//   * a single failure never trips anything (no permanent disabling)
//   * BREAKER_THRESHOLD consecutive hard failures open the breaker
//   * while open (BREAKER_COOLDOWN_MS) AI calls are skipped and callers use
//     their existing deterministic template fallback — generation still works
//   * the first success closes it again
//
// State is per server isolate and in-memory only: nothing is persisted, no
// setting values are mutated, and a cold start simply retries once.
// ---------------------------------------------------------------------------

const HARD_FAILURE_STATUSES = new Set([402, 403, 429]);
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 10 * 60 * 1000;

let consecutiveHardFailures = 0;
let openUntil = 0;

/** True when AI calls should be skipped right now. */
export function aiBreakerOpen(): boolean {
  if (openUntil === 0) return false;
  if (Date.now() >= openUntil) {
    // Cooldown elapsed — allow one probe.
    openUntil = 0;
    consecutiveHardFailures = 0;
    return false;
  }
  return true;
}

/** Record a gateway outcome. `status` is the HTTP status, if there was one. */
export function recordAiFailure(status?: number): void {
  if (status !== undefined && !HARD_FAILURE_STATUSES.has(status)) return;
  if (status === undefined) return; // network/parse errors keep existing behaviour
  consecutiveHardFailures += 1;
  if (consecutiveHardFailures >= BREAKER_THRESHOLD) {
    openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    console.error(
      `[ai-breaker] opened after ${consecutiveHardFailures} provider failures (last status ${status}); pausing AI calls for ${BREAKER_COOLDOWN_MS / 60000} min`,
    );
  }
}

export function recordAiSuccess(): void {
  consecutiveHardFailures = 0;
  openUntil = 0;
}
