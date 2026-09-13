// AG-1 verification — mocked, offline. No production database access.
import {
  analyzeSelfOptimization,
  summarizeSelfOptimization,
  selfOptimizationWritesEnabled,
} from "../src/lib/workforce/self-optimization.server";
import { EXECUTABLE_AGENTS, isGovernedOnly } from "../src/lib/workforce/registry";
import { AGENT_RUNNERS, hasRunner } from "../src/lib/ai/agent-runners";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (ok) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.error(`FAIL  ${name} ${extra}`);
  }
};

const writes: string[] = [];
function mockDb(rows: any[], settings: any = null) {
  const q: any = {
    select: () => q,
    eq: () => q,
    in: () => q,
    limit: async () => ({ data: rows, error: null }),
    maybeSingle: async () => ({ data: settings, error: null }),
    update: () => {
      writes.push("update");
      return q;
    },
    insert: () => {
      writes.push("insert");
      return q;
    },
    upsert: () => {
      writes.push("upsert");
      return q;
    },
    then: undefined,
  };
  return { from: () => q };
}

const flagged = [
  { slug: "movers-denver-co", clicks: 0, impressions: 400, ctr: 0, avg_position: 38, prev_avg_position: 22, index_status: "indexed", audit_score: 70, monitor_health: "degraded", status: "published" },
  { slug: "movers-austin-tx", clicks: 90, impressions: 1000, ctr: 0.09, avg_position: 4, prev_avg_position: 5, index_status: "indexed", audit_score: 97, monitor_health: "watch", status: "published" },
];

const run = async () => {
  // A. Legacy direct runner removed for self_optimization_agent
  check("A1 legacy AGENT_RUNNERS has no self_optimization_agent", !hasRunner("self_optimization_agent"));
  check("A2 registry UI routes it through governed path", isGovernedOnly("self_optimization_agent"));
  check("A3 other legacy runners untouched", Object.keys(AGENT_RUNNERS).length === 7 && hasRunner("blog_agent") && hasRunner("internal_linking_engine"));

  // B. Governed executor registered, read-only
  check("B1 executor descriptor registered", Boolean(EXECUTABLE_AGENTS["self_optimization_agent"]));
  check("B2 declared read_only + atomic", EXECUTABLE_AGENTS["self_optimization_agent"]?.mode === "read_only" && EXECUTABLE_AGENTS["self_optimization_agent"]?.atomic === true);
  check("B3 revenue/analytics untouched", EXECUTABLE_AGENTS["revenue_agent"]?.mode === "read_only" && EXECUTABLE_AGENTS["analytics_agent"]?.mode === "read_only");

  // D–I. Analysis run produces a proposal and writes nothing
  writes.length = 0;
  const a = await analyzeSelfOptimization(mockDb(flagged));
  check("D1 mode is analysis_only", a.mode === "analysis_only" && a.writesEnabled === false);
  check("D2 produced proposals", a.candidatesInspected === 2 && a.proposalCount >= 1, JSON.stringify(a.proposals));
  check("D3 summary states writes disabled", /production writes disabled/i.test(summarizeSelfOptimization(a)));
  check("E–I no write of any kind issued", writes.length === 0, writes.join(","));
  check("tablesRead is city_landing_pages only", JSON.stringify(a.tablesRead) === '["city_landing_pages"]');

  // Kill switch defaults
  check("K1 missing setting => writes disabled", (await selfOptimizationWritesEnabled(mockDb([], null))) === false);
  check("K2 explicit false => disabled", (await selfOptimizationWritesEnabled(mockDb([], { value: { write_enabled: false } }))) === false);
  check("K3 truthy string is not enough", (await selfOptimizationWritesEnabled(mockDb([], { value: { write_enabled: "true" } }))) === false);
  check("K4 explicit true => enabled", (await selfOptimizationWritesEnabled(mockDb([], { value: { write_enabled: true } }))) === true);

  // Empty candidate set
  const empty = await analyzeSelfOptimization(mockDb([]));
  check("empty set returns warning, no proposals", empty.proposalCount === 0 && empty.warnings.length === 1);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
};

void run();
