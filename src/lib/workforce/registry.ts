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
};

export const isExecutable = (key: string) => Boolean(EXECUTABLE_AGENTS[key]);
