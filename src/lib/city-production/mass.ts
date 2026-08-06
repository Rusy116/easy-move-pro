// ---------------------------------------------------------------------------
// PHASE 9 — MASS CITY PRODUCTION (CALIFORNIA FIRST)
//
// Pure definitions for the mass-production layer: batch sizes, worker
// concurrency, state rollout order. No I/O — safe to import in the browser.
// Extension only: nothing here touches CRM, marketplace, portals, auth or the
// quote engine.
// ---------------------------------------------------------------------------

/** Batch sizes offered by the factory console. */
export const BATCH_SIZES = [10, 100, 500, 1000, 5000] as const;

/** Parallel city workers per production tick. */
export const WORKER_OPTIONS = [1, 2, 3, 4, 5] as const;

/** Rollout order — California first, then the rest of the country. */
export const ROLLOUT_STATES: Array<{ code: string; name: string }> = [
  { code: "CA", name: "California" },
  { code: "TX", name: "Texas" },
  { code: "FL", name: "Florida" },
  { code: "NY", name: "New York" },
  { code: "IL", name: "Illinois" },
  { code: "AZ", name: "Arizona" },
  { code: "WA", name: "Washington" },
  { code: "NV", name: "Nevada" },
];

/** Persisted autopilot key so production resumes after an interruption. */
export const AUTOPILOT_STORAGE_KEY = "emp.city-factory.autopilot";

export interface MassProductionMetrics {
  publishedTotal: number;
  publishedToday: number;
  avgQuality: number | null;
  retries: number;
  duplicatesSkipped: number;
  currentWorker: string | null;
}
