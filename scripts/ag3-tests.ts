// AG-3 verification — mocked, offline. No production database, no GSC calls.
import { mock } from "bun:test";

const gscState: { fail: string | null; pages: any[]; prevPages: any[]; queries: any[] } = {
  fail: null,
  pages: [],
  prevPages: [],
  queries: [],
};
let gscCalls = 0;

mock.module("@/lib/demand/providers/gsc.server", () => ({
  resolveVerifiedProperty: async (p: string) => {
    gscCalls++;
    if (gscState.fail) throw new Error(gscState.fail);
    return p;
  },
  fetchSearchAnalytics: async (opts: any) => {
    gscCalls++;
    if (gscState.fail) throw new Error(gscState.fail);
    const rows =
      opts.dimensions[0] === "query"
        ? gscState.queries
        : opts.startDate < "2000-01-01" || opts.__prev
          ? gscState.prevPages
          : gscState.pages;
    const list = opts.dimensions[0] === "page" && opts.startDate === PREV_START ? gscState.prevPages : rows;
    const totals = list.reduce(
      (a: any, r: any) => ({
        clicks: a.clicks + r.clicks,
        impressions: a.impressions + r.impressions,
        ctr: 0,
        position: r.position,
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    );
    return { rows: list, totals };
  },
}));

const d = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const PREV_START = d(-3 - 27 - 1 - 27);

const {
  computeGooglePerformance,
  summarizeGooglePerformance,
  classifyPage,
  UNKNOWN_METRICS,
} = await import("../src/lib/workforce/google-performance.server");
const { EXECUTABLE_AGENTS, isGovernedOnly, governedBadge } = await import(
  "../src/lib/workforce/registry"
);
const { AGENT_RUNNERS, hasRunner } = await import("../src/lib/ai/agent-runners");

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
function mockDb(snaps: any[] = [{ file_key: "cities-1", url_count: 45000, city_url_count: 45000, is_active: true }]) {
  const q: any = {
    _table: "",
    select: (_s?: string, o?: any) =>
      o?.head ? Promise.resolve({ count: 28850, error: null }) : q,
    eq: () => (q._table === "sitemap_snapshots" ? Promise.resolve({ data: snaps, error: null }) : q),
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
  return {
    from: (t: string) => {
      q._table = t;
      return q;
    },
  };
}

const run = async () => {
  // A. Legacy runner removed
  check("A1 legacy AGENT_RUNNERS has no google_performance_agent", !hasRunner("google_performance_agent"));
  check("A2 Start is routed through the governed service", isGovernedOnly("google_performance_agent"));
  check(
    "A3/O AG-1 + AG-2 protections unchanged",
    isGovernedOnly("self_optimization_agent") &&
      !hasRunner("self_optimization_agent") &&
      isGovernedOnly("internal_linking_engine") &&
      !hasRunner("internal_linking_engine"),
  );
  check(
    "A4 other legacy runners untouched",
    Object.keys(AGENT_RUNNERS).length === 5 && hasRunner("blog_agent") && hasRunner("product_factory"),
    Object.keys(AGENT_RUNNERS).join(","),
  );

  // B/C. Executor registered, read-only
  check("B executor descriptor registered", Boolean(EXECUTABLE_AGENTS["google_performance_agent"]));
  check(
    "C declared read_only + atomic",
    EXECUTABLE_AGENTS["google_performance_agent"]?.mode === "read_only" &&
      EXECUTABLE_AGENTS["google_performance_agent"]?.atomic === true,
  );
  check("UI badge says real GSC read-only", governedBadge("google_performance_agent") === "Real GSC data — read only");
  check(
    "analytics_agent / revenue_agent descriptors unchanged",
    EXECUTABLE_AGENTS["analytics_agent"]?.mode === "read_only" &&
      EXECUTABLE_AGENTS["revenue_agent"]?.mode === "read_only",
  );

  // D/E. Existing provider reused — the engine imports only gsc.server
  const src = await Bun.file("src/lib/workforce/google-performance.server.ts").text();
  check("D reuses the existing GSC provider", src.includes('from "@/lib/demand/providers/gsc.server"'));
  check(
    "E no second GSC auth stack",
    !/googleapis|JWT|private_key|oauth|client_secret/i.test(src) && !src.includes("process.env"),
  );

  // Page classification
  check(
    "page family classification",
    classifyPage("https://www.easymove.pro/movers/denver-co") === "movers" &&
      classifyPage("https://www.easymove.pro/moving-calculator-denver-co") === "calculator" &&
      classifyPage("https://www.easymove.pro/colorado/denver-movers") === "state_city" &&
      classifyPage("https://www.easymove.pro/products") === "other",
  );

  // Happy path
  gscState.fail = null;
  gscState.pages = [
    { key: "https://www.easymove.pro/movers/denver-co", clicks: 0, impressions: 900, ctr: 0, position: 12.4 },
    { key: "https://www.easymove.pro/moving-calculator-denver-co", clicks: 40, impressions: 800, ctr: 0.05, position: 6.1 },
    { key: "https://www.easymove.pro/products", clicks: 3, impressions: 60, ctr: 0.05, position: 30 },
  ];
  gscState.prevPages = [
    { key: "https://www.easymove.pro/movers/denver-co", clicks: 20, impressions: 800, ctr: 0.025, position: 5.0 },
  ];
  gscState.queries = [{ key: "denver movers", clicks: 12, impressions: 500, ctr: 0.024, position: 8.2 }];
  writes.length = 0;
  gscCalls = 0;

  const r = await computeGooglePerformance(mockDb());
  check("report is read_only mode", r.mode === "read_only" && r.writesPerformed === 0);
  check("GSC observed section populated", r.gscAvailable && r.gscObserved !== null);
  check("real GSC requests were read-only reads", r.gscRequests === 4 && gscCalls === 4);
  check("zero-click detection", r.gscObserved!.zeroClickPages.some((p) => p.page.endsWith("/movers/denver-co")));
  check("CTR opportunity detection", r.gscObserved!.ctrOpportunities.length === 1);
  check(
    "ranking decline vs previous closed window",
    r.gscObserved!.rankingDeclines.length === 1 && r.gscObserved!.rankingDeclines[0]!.delta === 7.4,
    JSON.stringify(r.gscObserved!.rankingDeclines),
  );
  check(
    "family rollup covers movers + calculator",
    r.gscObserved!.families.some((f) => f.family === "movers") &&
      r.gscObserved!.families.some((f) => f.family === "calculator"),
  );
  check(
    "N output separates GSC / site / unknown",
    r.gscObserved !== null &&
      r.siteObserved.publishedCityPages === 28850 &&
      r.unknown.length === UNKNOWN_METRICS.length &&
      r.unknown.every((u) => /UNKNOWN/.test(u)),
  );
  check("H no database write issued", writes.length === 0, writes.join(","));
  check(
    "I–M no mutation/indexing surface in the engine",
    !/\.update\(|\.insert\(|\.upsert\(|\.delete\(|urlNotifications|indexing|submit/i.test(src),
  );
  check("recommendations only", r.recommendations.length > 0 && !("actionsApplied" in r));

  // F/G. GSC unavailable
  gscState.fail = "service account token rejected";
  const down = await computeGooglePerformance(mockDb());
  check("F explicit unavailable state", down.gscAvailable === false && down.gscObserved === null);
  check("F summary says GSC data unavailable", /GSC data unavailable/.test(summarizeGooglePerformance(down)));
  check(
    "G no synthetic Google metrics on failure",
    down.property === null &&
      down.gscUnavailableReason === "service account token rejected" &&
      down.siteObserved.publishedCityPages === 28850,
  );
  check("site-observed data still labeled separately", Object.keys(down.siteObserved).includes("publishedCityPages"));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
};

await run();
