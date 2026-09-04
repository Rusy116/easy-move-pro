// ---------------------------------------------------------------------------
// Server-only executor registry for the AI Workforce.
//
// One entry per agent that has a REAL runner. Agents absent from this map are
// NOT executable from /ai/workforce — their Start controls remain disconnected.
// ---------------------------------------------------------------------------
import { computeRevenueAnalysis, summarizeRevenue } from "./revenue.server";
import { computeAnalytics, summarizeAnalytics } from "./analytics.server";

export type ExecutorLog = (
  message: string,
  level?: "info" | "warn" | "error",
) => Promise<void>;

export type ExecutorContext = {
  /** RLS-scoped client for the requesting admin. */
  supabase: any;
  userId: string;
  log: ExecutorLog;
};

export type ExecutorResult = {
  summary: string;
  result: Record<string, unknown>;
  itemsProcessed: number;
  aiCalls: number;
  externalCalls: number;
  tablesRead: string[];
  tablesWritten: string[];
};

export type WorkforceExecutor = {
  key: string;
  /** Short human label written to ai_agents.current_task while running. */
  taskLabel: string;
  mode: "read_only" | "mutating";
  atomic: boolean;
  run: (ctx: ExecutorContext) => Promise<ExecutorResult>;
};

export const WORKFORCE_EXECUTORS: Record<string, WorkforceExecutor> = {
  revenue_agent: {
    key: "revenue_agent",
    taskLabel: "Revenue analysis (read-only)",
    mode: "read_only",
    atomic: true,
    async run(ctx) {
      await ctx.log("runner_invoked: revenue analysis (read-only)");
      // writeMetrics is deliberately off: AG-2 forbids any non-observability write.
      const analysis = await computeRevenueAnalysis(ctx.supabase, { writeMetrics: false });
      await ctx.log(
        `runner_completed: analysed ${analysis.rowsAnalyzed} finance row(s) across ${analysis.tablesRead.length} table(s)`,
      );
      return {
        summary: summarizeRevenue(analysis),
        result: analysis as unknown as Record<string, unknown>,
        itemsProcessed: analysis.rowsAnalyzed,
        aiCalls: 0,
        externalCalls: 0,
        tablesRead: analysis.tablesRead,
        tablesWritten: [],
      };
    },
  },

  analytics_agent: {
    key: "analytics_agent",
    taskLabel: "Analytics rollup (read-only)",
    mode: "read_only",
    atomic: true,
    async run(ctx) {
      await ctx.log("runner_invoked: analytics rollup (read-only, deterministic)");
      const a = await computeAnalytics(ctx.supabase, ctx.log);
      for (const w of a.warnings) await ctx.log(`warning: ${w}`, "warn");
      await ctx.log(
        `runner_completed: ${a.metricsAnalyzed} metric(s), ${a.gscRequests} Search Console request(s)`,
      );
      return {
        summary: summarizeAnalytics(a),
        result: a as unknown as Record<string, unknown>,
        itemsProcessed: a.rowsAnalyzed,
        aiCalls: 0,
        externalCalls: a.gscRequests,
        tablesRead: a.tablesRead,
        tablesWritten: [],
      };
    },
  },
};
