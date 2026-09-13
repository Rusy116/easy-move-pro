// ---------------------------------------------------------------------------
// Client-safe descriptors of which Workforce agents have a REAL executor.
// Adding a new agent later = one entry here + one executor in
// executors.server.ts. Nothing else in the UI changes.
// ---------------------------------------------------------------------------

export type WorkforceAgentDescriptor = {
  key: string;
  /** read_only = executor performs no business-data writes. */
  mode: "read_only" | "mutating";
  /** Atomic runs cannot be paused/resumed/stopped mid-flight. */
  atomic: boolean;
};

export const EXECUTABLE_AGENTS: Record<string, WorkforceAgentDescriptor> = {
  revenue_agent: { key: "revenue_agent", mode: "read_only", atomic: true },
  analytics_agent: { key: "analytics_agent", mode: "read_only", atomic: true },
  // AG-1: migrated off the legacy direct-runner path. Analysis only.
  self_optimization_agent: { key: "self_optimization_agent", mode: "read_only", atomic: true },
  // AG-2: migrated off the legacy direct-runner path. Analysis only.
  internal_linking_engine: { key: "internal_linking_engine", mode: "read_only", atomic: true },
  // AG-3: migrated off the legacy direct-runner path. Real GSC data, read only.
  google_performance_agent: { key: "google_performance_agent", mode: "read_only", atomic: true },
};

/**
 * Agents whose legacy /ai/registry Start action MUST be routed through the
 * governed Workforce execution service instead of a direct runner.
 */
export const GOVERNED_ONLY_AGENTS = new Set<string>([
  "self_optimization_agent",
  "internal_linking_engine",
  "google_performance_agent",
]);

export const isGovernedOnly = (key: string) => GOVERNED_ONLY_AGENTS.has(key);

export const isExecutable = (key: string) => Boolean(EXECUTABLE_AGENTS[key]);
