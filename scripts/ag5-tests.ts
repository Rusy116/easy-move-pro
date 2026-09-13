// AG-5 verification — mocked, offline. No AI call, no production database.
import { mock } from "bun:test";

const gen: { calls: Array<{ audience: string; count: number }>; created: number } = {
  calls: [],
  created: 0,
};

mock.module("@/lib/ai-ecosystem.functions", () => ({
  writeArticles: async (_ctx: any, audience: string, count: number) => {
    gen.calls.push({ audience, count });
    return {
      created: gen.created,
      aiGenerated: gen.created,
      titles: Array.from({ length: gen.created }, (_, i) => `Mover asset ${i + 1}`),
    };
  },
  runProductAgent: async () => ({ created: 0, titles: [] }),
  runImageAgent: async () => ({ contentBriefed: 0, productsBriefed: 0 }),
  runRevenueAgent: async () => ({ platformRevenue: 0, productRevenue: 0 }),
  ecosystemStatus: async () => ({}),
}));
mock.module("@/lib/ai-ecosystem.server", () => ({ MODEL: "openai/gpt-5.6-sol" }));

const {
  runMoverGrowthDraftGeneration,
  summarizeMoverGrowthRun,
  clampMoverGrowthCount,
  MOVER_GROWTH_MODEL,
} = await import("../src/lib/workforce/mover-growth.server");
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

const touched: string[] = [];
function mockDb(drafts: any[]) {
  return {
    from(table: string) {
      touched.push(table);
      const q: any = {
        select: () => q,
        eq: () => q,
        gte: () => q,
        order: () => Promise.resolve({ data: drafts, error: null }),
        update: () => {
          touched.push(`${table}:update`);
          return q;
        },
        insert: () => {
          touched.push(`${table}:insert`);
          return q;
        },
      };
      return q;
    },
  };
}

const run = async () => {
  check("A mover_growth_agent removed from legacy AGENT_RUNNERS", !hasRunner("mover_growth_agent"));
  check(
    "B remaining legacy runners unchanged",
    Object.keys(AGENT_RUNNERS).length === 3 &&
      hasRunner("product_factory") &&
      hasRunner("image_factory") &&
      hasRunner("revenue_agent"),
    Object.keys(AGENT_RUNNERS).join(","),
  );

  check(
    "C Workforce executor registered + governed",
    Boolean(EXECUTABLE_AGENTS["mover_growth_agent"]) && isGovernedOnly("mover_growth_agent"),
  );
  check(
    "C badge",
    governedBadge("mover_growth_agent") === "Draft only — no automatic publishing",
  );

  const src = await Bun.file("src/lib/workforce/mover-growth.server.ts").text();
  check(
    "D reuses existing generator and AI provider path",
    src.includes('from "@/lib/ai-ecosystem.functions"') &&
      src.includes('from "@/lib/ai-ecosystem.server"'),
  );
  check(
    "E no duplicate AI gateway",
    !/ai\.gateway\.lovable\.dev|LOVABLE_API_KEY|new OpenAI|fetch\(/.test(src),
  );
  check("provider/model reported", MOVER_GROWTH_MODEL === "openai/gpt-5.6-sol");

  check(
    "count clamped 1–10, default 1",
    clampMoverGrowthCount(undefined) === 1 &&
      clampMoverGrowthCount(0) === 1 &&
      clampMoverGrowthCount(-3) === 1 &&
      clampMoverGrowthCount(50) === 10 &&
      clampMoverGrowthCount("x") === 1 &&
      clampMoverGrowthCount(4) === 4,
  );

  gen.calls = [];
  gen.created = 1;
  touched.length = 0;
  const one = await runMoverGrowthDraftGeneration(
    mockDb([
      {
        id: "m1",
        title: "Mover asset 1",
        slug: "mover-asset-1",
        kind: "mover_article",
        status: "draft",
        quality_score: 92,
      },
    ]),
    { count: 1 },
  );
  check(
    "D generation delegated with audience=mover, count=1",
    gen.calls.length === 1 && gen.calls[0]!.audience === "mover" && gen.calls[0]!.count === 1,
  );
  check(
    "F persisted content reported as draft only",
    one.mode === "draft_only" && one.drafts.every((d) => d.status === "draft"),
  );
  check(
    "result summary fields",
    one.publicationActionsPerformed === 0 &&
      one.productionPageMutations === 0 &&
      one.writesPerformed === 1 &&
      one.drafts[0]?.qualityScore === 92,
  );
  check("summary states draft only", /Draft only — no automatic publishing/.test(summarizeMoverGrowthRun(one)));

  const code = src
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");
  check("G no publish surface", !/published_at|is_published|publishBlog|\bpublish\(/i.test(code));
  check("H no live city page mutation", !/city_landing_pages|seo_status/i.test(code));
  check("I no mover/partner page mutation", !/movers_profiles|partner_pages|mover_profiles/i.test(code));
  check("J no CRM/lead mutation", !/\bleads\b|crm_|deals/i.test(code));
  check("K no email/SMS action", !/resend|sendEmail|twilio|\bsms\b/i.test(code));
  check("L no sitemap mutation", !/sitemap/i.test(code));
  check("M no Search Console submission", !/searchconsole|indexing|gsc/i.test(code));
  check("N no City Factory enqueue", !/city_production|city_factory|enqueue/i.test(code));
  check("O no PDF Factory enqueue", !/pdf_/i.test(code));
  check("P no Store/Stripe mutation", !/stripe|store_orders|products\b/i.test(code));
  check(
    "only ai_content_items touched, no direct write from the core",
    [...new Set(touched)].join(",") === "ai_content_items" && !touched.some((t) => t.includes(":")),
    touched.join(","),
  );

  gen.created = 0;
  const none = await runMoverGrowthDraftGeneration(mockDb([]), { count: 3 });
  check(
    "failure safety: no synthetic content",
    none.generatedCount === 0 && none.failedCount === 3 && none.drafts.length === 0 &&
      none.warnings.length === 1,
  );

  check(
    "Q AG-1..AG-4 protections intact",
    isGovernedOnly("self_optimization_agent") &&
      isGovernedOnly("internal_linking_engine") &&
      isGovernedOnly("google_performance_agent") &&
      isGovernedOnly("blog_agent") &&
      !hasRunner("self_optimization_agent") &&
      !hasRunner("internal_linking_engine") &&
      !hasRunner("google_performance_agent") &&
      !hasRunner("blog_agent"),
  );
  check(
    "R analytics_agent and revenue_agent unchanged",
    EXECUTABLE_AGENTS["analytics_agent"]?.mode === "read_only" &&
      EXECUTABLE_AGENTS["revenue_agent"]?.mode === "read_only" &&
      !isGovernedOnly("revenue_agent"),
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
};

await run();
