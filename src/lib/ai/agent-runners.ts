// ---------------------------------------------------------------------------
// Maps a registry agent key to a real executable runner. Agents without a
// direct runner are dispatched through the orchestrator queue instead, so new
// registry records work immediately without any code change here.
// ---------------------------------------------------------------------------
import {
  runProductAgent,
  runImageAgent,
  runRevenueAgent,
} from "@/lib/ai-ecosystem.functions";

export type AgentRunner = () => Promise<string>;

const n = (v: unknown) => Number(v ?? 0);

export const AGENT_RUNNERS: Record<string, AgentRunner> = {
  // AG-4: blog_agent deliberately has NO legacy direct runner. It is executed
  // exclusively through the governed Workforce execution service, draft-only.
  // AG-5: mover_growth_agent deliberately has NO legacy direct runner. It is
  // executed exclusively through the governed Workforce execution service,
  // draft-only (see src/lib/workforce/mover-growth.server.ts).
  product_factory: async () => {
    const r = await runProductAgent({ data: { count: 2 } });
    return `${r.created} digital products created`;
  },
  image_factory: async () => {
    const r = await runImageAgent({ data: { limit: 40 } });
    return `${r.contentBriefed} article image sets, ${r.productsBriefed} product covers`;
  },
  revenue_agent: async () => {
    const r = await runRevenueAgent({ data: {} as never });
    return `platform $${n(r.platformRevenue).toLocaleString()} · products $${n(r.productRevenue).toLocaleString()}`;
  },
  // AG-2: internal_linking_engine deliberately has NO legacy direct runner.
  // It is executed exclusively through the governed Workforce execution
  // service (see src/lib/workforce/registry.ts → GOVERNED_ONLY_AGENTS).

  // AG-3: google_performance_agent deliberately has NO legacy direct runner.
  // It is executed exclusively through the governed Workforce execution
  // service, which reads REAL Search Console data (see
  // src/lib/workforce/google-performance.server.ts).
  // AG-1: self_optimization_agent deliberately has NO legacy direct runner.
  // It is executed exclusively through the governed Workforce execution
  // service (see src/lib/workforce/registry.ts → GOVERNED_ONLY_AGENTS).
};

export const hasRunner = (key: string) => Boolean(AGENT_RUNNERS[key]);
