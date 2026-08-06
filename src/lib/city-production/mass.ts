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

/**
 * Rollout order — priority markets first (CA → TX → FL → NY), then every
 * remaining state by moving demand. The factory rolls state by state until
 * the full master dataset is produced.
 */
export const ROLLOUT_STATES: Array<{ code: string; name: string }> = [
  { code: "CA", name: "California" },
  { code: "TX", name: "Texas" },
  { code: "FL", name: "Florida" },
  { code: "NY", name: "New York" },
  { code: "IL", name: "Illinois" },
  { code: "PA", name: "Pennsylvania" },
  { code: "OH", name: "Ohio" },
  { code: "GA", name: "Georgia" },
  { code: "NC", name: "North Carolina" },
  { code: "MI", name: "Michigan" },
  { code: "NJ", name: "New Jersey" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "AZ", name: "Arizona" },
  { code: "MA", name: "Massachusetts" },
  { code: "TN", name: "Tennessee" },
  { code: "IN", name: "Indiana" },
  { code: "MO", name: "Missouri" },
  { code: "MD", name: "Maryland" },
  { code: "WI", name: "Wisconsin" },
  { code: "CO", name: "Colorado" },
  { code: "MN", name: "Minnesota" },
  { code: "SC", name: "South Carolina" },
  { code: "AL", name: "Alabama" },
  { code: "LA", name: "Louisiana" },
  { code: "KY", name: "Kentucky" },
  { code: "OR", name: "Oregon" },
  { code: "OK", name: "Oklahoma" },
  { code: "CT", name: "Connecticut" },
  { code: "UT", name: "Utah" },
  { code: "NV", name: "Nevada" },
  { code: "IA", name: "Iowa" },
  { code: "AR", name: "Arkansas" },
  { code: "MS", name: "Mississippi" },
  { code: "KS", name: "Kansas" },
  { code: "NM", name: "New Mexico" },
  { code: "NE", name: "Nebraska" },
  { code: "ID", name: "Idaho" },
  { code: "WV", name: "West Virginia" },
  { code: "HI", name: "Hawaii" },
  { code: "NH", name: "New Hampshire" },
  { code: "ME", name: "Maine" },
  { code: "MT", name: "Montana" },
  { code: "RI", name: "Rhode Island" },
  { code: "DE", name: "Delaware" },
  { code: "SD", name: "South Dakota" },
  { code: "ND", name: "North Dakota" },
  { code: "AK", name: "Alaska" },
  { code: "DC", name: "District of Columbia" },
  { code: "VT", name: "Vermont" },
  { code: "WY", name: "Wyoming" },
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
