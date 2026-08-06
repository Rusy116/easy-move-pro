// ---------------------------------------------------------------------------
// PHASE 10 — AI SUPERVISOR (MASS PRODUCTION ORCHESTRATOR)
//
// Pure definitions only: queue states, the supervisor agent chain, health
// checks and report kinds. No I/O — safe to import from the browser.
//
// The Supervisor NEVER generates content. It plans, leases, monitors, retries
// and reports on top of the existing 12-stage production factory. Nothing here
// touches CRM, marketplace, portals, auth, the calculator or the quote engine.
// ---------------------------------------------------------------------------
import { PRODUCTION_STAGES, type ProductionStageKey } from "@/lib/city-production/stages";

// ── Queue states ───────────────────────────────────────────────────────────
export const SUPERVISOR_STATES = [
  "waiting",
  "assigned",
  "running",
  "paused",
  "completed",
  "retry",
  "failed",
  "cancelled",
] as const;
export type SupervisorState = (typeof SUPERVISOR_STATES)[number];

export const STATE_TONE: Record<string, string> = {
  waiting: "bg-muted text-muted-foreground",
  assigned: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  running: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  paused: "bg-foreground/10 text-foreground",
  completed: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  retry: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  failed: "bg-destructive/12 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
};

/** Maps the factory job status onto the supervisor queue vocabulary. */
export function stateFor(job: {
  status: string;
  attempts: number;
  leased_until?: string | null;
  supervisor_state?: string | null;
  skipped_reason?: string | null;
}): SupervisorState {
  if (job.skipped_reason) return "cancelled";
  if (job.status === "completed") return "completed";
  if (job.status === "paused") return "paused";
  if (job.status === "failed") return job.attempts >= MAX_SUPERVISOR_RETRIES ? "failed" : "retry";
  if (job.leased_until && new Date(job.leased_until).getTime() > Date.now()) return "running";
  if (job.status === "running") return "assigned";
  return "waiting";
}

// ── Agent chain (13 supervised agents over the 12 factory stages) ──────────
export interface SupervisorAgent {
  order: number;
  key: string;
  name: string;
  /** Underlying production stage step this agent drives. */
  step: number;
  stageKey: ProductionStageKey;
}

const byKey = (k: ProductionStageKey) => PRODUCTION_STAGES.find((s) => s.key === k)!;

const CHAIN_DEF: Array<{ key: string; name: string; stageKey: ProductionStageKey }> = [
  { key: "usa_dataset", name: "USA Dataset Agent", stageKey: "usa_data" },
  { key: "calculator", name: "Calculator Agent", stageKey: "calculator" },
  { key: "seo", name: "SEO Agent", stageKey: "seo" },
  { key: "internal_linking", name: "Internal Linking Agent", stageKey: "internal_links" },
  { key: "image_generation", name: "Image Generation Agent", stageKey: "image_factory" },
  { key: "image_optimization", name: "Image Optimization Agent", stageKey: "image_seo" },
  { key: "blog", name: "Moving Blog Agent", stageKey: "blog" },
  { key: "mover_content", name: "Mover Content Agent", stageKey: "mover_content" },
  { key: "digital_product", name: "Digital Product Agent", stageKey: "digital_product" },
  { key: "quality_audit", name: "Quality Audit Agent", stageKey: "quality" },
  { key: "publish", name: "Publish Agent", stageKey: "publish" },
  { key: "indexing", name: "Indexing Agent", stageKey: "publish" },
  { key: "monitoring", name: "Monitoring Agent", stageKey: "analytics" },
];

export const SUPERVISOR_CHAIN: SupervisorAgent[] = CHAIN_DEF.map((a, i) => ({
  ...a,
  order: i + 1,
  step: byKey(a.stageKey).step,
}));

export function agentForStep(step: number): SupervisorAgent | null {
  return SUPERVISOR_CHAIN.find((a) => a.step === step) ?? null;
}

// ── Policy ─────────────────────────────────────────────────────────────────
/** Retries a failed stage up to 3 times, then the page is skipped, not blocking. */
export const MAX_SUPERVISOR_RETRIES = 3;
/** A worker holds an exclusive lease on a city for this long. */
export const LEASE_MS = 3 * 60 * 1000;
/** Health sweep cadence. */
export const HEALTH_INTERVAL_MS = 60_000;
export const SUPERVISOR_STORAGE_KEY = "emp.ai-supervisor.autopilot";

// ── Health monitor ─────────────────────────────────────────────────────────
export const HEALTH_CHECKS = [
  "agents",
  "memory",
  "queue",
  "database",
  "api",
  "publishing",
  "indexing",
  "images",
] as const;
export type HealthCheckKey = (typeof HEALTH_CHECKS)[number];

export const HEALTH_LABELS: Record<HealthCheckKey, string> = {
  agents: "Agents alive",
  memory: "Memory / leases",
  queue: "Queue",
  database: "Database",
  api: "API",
  publishing: "Publishing",
  indexing: "Indexing",
  images: "Images",
};

export type HealthStatus = "ok" | "warn" | "down";

export interface HealthResult {
  key: HealthCheckKey;
  status: HealthStatus;
  detail: string;
}

// ── Reports ────────────────────────────────────────────────────────────────
export const REPORT_KINDS = ["production", "seo", "publishing", "quality", "revenue"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_LABELS: Record<ReportKind, string> = {
  production: "Production Report",
  seo: "SEO Report",
  publishing: "Publishing Report",
  quality: "Quality Report",
  revenue: "Revenue Report",
};

export interface SupervisorReport {
  id: string;
  batch_label: string;
  kind: string;
  state_code: string | null;
  summary: string;
  metrics: Record<string, number | string | null>;
  created_at: string;
}

export interface SupervisorIncident {
  id: string;
  kind: string;
  severity: string;
  agent_key: string | null;
  landing_slug: string | null;
  message: string;
  details: Record<string, string | number | boolean | null>;
  resolved_at: string | null;
  created_at: string;
}
