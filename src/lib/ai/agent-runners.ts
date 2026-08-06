// ---------------------------------------------------------------------------
// Maps a registry agent key to a real executable runner. Agents without a
// direct runner are dispatched through the orchestrator queue instead, so new
// registry records work immediately without any code change here.
// ---------------------------------------------------------------------------
import {
  runBlogAgent,
  runGrowthAgent,
  runProductAgent,
  runImageAgent,
  runRevenueAgent,
} from "@/lib/ai-ecosystem.functions";
import {
  auditFactoryBatch,
  runFactoryMonitor,
  runSelfImprovement,
} from "@/lib/city-factory.functions";

export type AgentRunner = () => Promise<string>;

const n = (v: unknown) => Number(v ?? 0);

export const AGENT_RUNNERS: Record<string, AgentRunner> = {
  blog_agent: async () => {
    const r = await runBlogAgent({ data: { count: 3 } });
    return `${r.created} articles drafted (${r.aiGenerated} AI-written)`;
  },
  mover_growth_agent: async () => {
    const r = await runGrowthAgent({ data: { count: 3 } });
    return `${r.created} mover articles drafted (${r.aiGenerated} AI-written)`;
  },
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
  internal_linking_engine: async () => {
    const r = await auditFactoryBatch({ data: { limit: 25 } });
    return `${r.audited} pages audited, ${r.passed} passed, ${r.returned} returned`;
  },
  google_performance_agent: async () => {
    const r = await runFactoryMonitor({ data: { limit: 200 } });
    return `${r.monitored} pages monitored, ${r.degraded} degraded`;
  },
  self_optimization_agent: async () => {
    const r = await runSelfImprovement({ data: { limit: 20 } });
    return `${r.improved}/${r.candidates} pages regenerated`;
  },
};

export const hasRunner = (key: string) => Boolean(AGENT_RUNNERS[key]);
