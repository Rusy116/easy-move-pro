// AG-2 verification — mocked, offline. No production database access.
import {
  analyzeInternalLinking,
  summarizeInternalLinking,
  internalLinkingWritesEnabled,
} from "../src/lib/workforce/internal-linking.server";
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
    order: () => q,
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
  };
  return { from: () => q };
}

const pages = [
  {
    slug: "movers-denver-co",
    status: "published",
    seo_status: "published",
    audit_score: 91,
    internal_links: [
      { href: "/movers/aurora-co" },
      { href: "/movers/ghost-town-zz" },
      "/moving-calculator-denver-co",
    ],
  },
  {
    slug: "movers-aurora-co",
    status: "published",
    seo_status: "published",
    audit_score: 88,
    internal_links: Array.from({ length: 9 }, (_, i) => ({ href: `/movers/peer-${i}-co` })).concat([
      { href: "/movers/denver-co" } as any,
    ]),
  },
];

const run = async () => {
  // A. Legacy direct execution removed
  check("A1 legacy AGENT_RUNNERS has no internal_linking_engine", !hasRunner("internal_linking_engine"));
  check("A2 registry Start routes through governed path", isGovernedOnly("internal_linking_engine"));
  check("A3 AG-1 protection intact", isGovernedOnly("self_optimization_agent") && !hasRunner("self_optimization_agent"));
  check(
    "A4 other legacy runners untouched",
    Object.keys(AGENT_RUNNERS).length === 6 &&
      hasRunner("blog_agent") &&
      hasRunner("mover_growth_agent") &&
      hasRunner("product_factory") &&
      hasRunner("image_factory") &&
      hasRunner("google_performance_agent"),
    Object.keys(AGENT_RUNNERS).join(","),
  );

  // B/C. Governed executor registered, read-only + atomic (single-active guard)
  check("B1 executor descriptor registered", Boolean(EXECUTABLE_AGENTS["internal_linking_engine"]));
  check(
    "B2/C declared read_only + atomic (single-active guard applies)",
    EXECUTABLE_AGENTS["internal_linking_engine"]?.mode === "read_only" &&
      EXECUTABLE_AGENTS["internal_linking_engine"]?.atomic === true,
  );
  check(
    "B3 protected agents unchanged",
    EXECUTABLE_AGENTS["revenue_agent"]?.mode === "read_only" &&
      EXECUTABLE_AGENTS["analytics_agent"]?.mode === "read_only" &&
      EXECUTABLE_AGENTS["self_optimization_agent"]?.mode === "read_only",
  );

  // D–L. Analysis produces a proposal only, zero writes
  writes.length = 0;
  const a = await analyzeInternalLinking(mockDb(pages));
  check("D1 mode analysis_only, writes disabled", a.mode === "analysis_only" && a.writesEnabled === false);
  check("D2 inspected pages and links", a.pagesInspected === 2 && a.linksInspected === 13, JSON.stringify(a));
  check("D3 detects thin link page", a.proposals.some((p) => p.slug === "movers-denver-co" && p.suggestedAdditions === 5));
  check("D4 detects broken internal links", a.brokenLinkCount === 10 && a.proposals.some((p) => p.issues.some((i) => i.includes("/movers/ghost-town-zz"))), String(a.brokenLinkCount));
  check("D5 summary states writes disabled", /production writes disabled/i.test(summarizeInternalLinking(a)));
  check("E–I no write of any kind issued", writes.length === 0, writes.join(","));
  check("J/K/L reads only city_landing_pages", JSON.stringify(a.tablesRead) === '["city_landing_pages"]');

  // M. Write gate defaults
  check("M1 missing setting => disabled", (await internalLinkingWritesEnabled(mockDb([], null))) === false);
  check("M2 explicit false => disabled", (await internalLinkingWritesEnabled(mockDb([], { value: { write_enabled: false } }))) === false);
  check("M3 malformed/truthy string => disabled", (await internalLinkingWritesEnabled(mockDb([], { value: { write_enabled: "true" } }))) === false);
  check("M4 explicit true => enabled", (await internalLinkingWritesEnabled(mockDb([], { value: { write_enabled: true } }))) === true);

  const empty = await analyzeInternalLinking(mockDb([]));
  check("empty set returns warning, no proposals", empty.proposalCount === 0 && empty.warnings.length === 1);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
};

void run();

// N. Legacy mutation function is gated at source level (auditFactoryBatch).
import { readFileSync } from "node:fs";
const src = readFileSync("src/lib/city-factory.functions.ts", "utf8");
const gated =
  src.includes("internalLinkingWritesEnabled") &&
  /auditOne\(\s*\n?[^)]*writesEnabled\s*=\s*false/s.test(src) &&
  src.includes("if (!writesEnabled) {");
console.log(gated ? "PASS  N legacy auditFactoryBatch write-gated" : "FAIL  N legacy gate missing");
if (!gated) process.exit(1);
