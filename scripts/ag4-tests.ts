// AG-4 verification — mocked, offline. No AI call, no production database.
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
      titles: Array.from({ length: gen.created }, (_, i) => `Article ${i + 1}`),
    };
  },
}));
mock.module("@/lib/ai-ecosystem.server", () => ({ MODEL: "openai/gpt-5.6-sol" }));

const { runBlogDraftGeneration, summarizeBlogRun, clampBlogCount, BLOG_MODEL } = await import(
  "../src/lib/workforce/blog.server"
);
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
  // A/B. Legacy map
  check("A blog_agent removed from legacy AGENT_RUNNERS", !hasRunner("blog_agent"));
  check(
    "B other legacy runners unchanged",
    Object.keys(AGENT_RUNNERS).length === 4 &&
      hasRunner("mover_growth_agent") &&
      hasRunner("product_factory") &&
      hasRunner("image_factory") &&
      hasRunner("revenue_agent"),
    Object.keys(AGENT_RUNNERS).join(","),
  );

  // C. Registered in Workforce
  check("C registered in Workforce", Boolean(EXECUTABLE_AGENTS["blog_agent"]) && isGovernedOnly("blog_agent"));
  check("C badge", governedBadge("blog_agent") === "Draft only — human publishing required");

  // D. Reuses existing generation + provider
  const src = await Bun.file("src/lib/workforce/blog.server.ts").text();
  check(
    "D reuses existing generator and AI provider path",
    src.includes('from "@/lib/ai-ecosystem.functions"') && src.includes('from "@/lib/ai-ecosystem.server"'),
  );
  check("D no duplicate gateway in the executor core", !/ai\.gateway\.lovable\.dev|LOVABLE_API_KEY/.test(src));
  check("provider/model reported", BLOG_MODEL === "openai/gpt-5.6-sol");

  // E/F. Count handling
  check(
    "F count clamped to 1–10 server-side",
    clampBlogCount(0) === 1 &&
      clampBlogCount(-5) === 1 &&
      clampBlogCount(11) === 10 &&
      clampBlogCount(99) === 10 &&
      clampBlogCount(undefined) === 1 &&
      clampBlogCount("abc") === 1 &&
      clampBlogCount(4) === 4,
  );

  gen.calls = [];
  gen.created = 1;
  touched.length = 0;
  const one = await runBlogDraftGeneration(
    mockDb([{ id: "d1", title: "Article 1", slug: "article-1", status: "draft", quality_score: 92 }]),
    { count: 1 },
  );
  check("E count=1 requests exactly one article", gen.calls.length === 1 && gen.calls[0]!.count === 1);
  check("E never silently generates 3", one.requestedCount === 1 && one.generatedCount === 1);
  check("G draft creation reported with ids/slugs/scores", one.drafts[0]?.id === "d1" && one.drafts[0]?.qualityScore === 92 && one.slugs[0] === "article-1");
  check("result summary fields", one.mode === "draft_only" && one.publicationActionsPerformed === 0 && one.writesPerformed === 1);
  check("summary states draft only", /Draft only — human publishing required/.test(summarizeBlogRun(one)));

  // H/I–N. Publishing and other systems are unreachable from this executor
  check(
    "H no publish surface in the executor core",
    !/published_at|publishBlog|unpublishBlog|blog-publish|is_published|\bpublish\(/i.test(src),
  );
  check(
    "I–N no city/sitemap/product/factory/email surface",
    !/city_landing_pages|sitemap|pdf_|city_production|indexing|resend|sendEmail|twilio|sms/i.test(src),
  );
  check("only ai_content_items is touched", [...new Set(touched)].join(",") === "ai_content_items", touched.join(","));
  check("no update/insert issued by the executor core", !touched.some((t) => t.includes(":")), touched.join(","));

  // I. Admin publish functions untouched
  const publishSrc = await Bun.file("src/lib/blog-publish.functions.ts").text();
  check(
    "I admin publish/unpublish functions still exist and are separate",
    /publishBlogDraft|publish/i.test(publishSrc) && !publishSrc.includes("workforce"),
  );

  // Failure safety
  gen.created = 0;
  const none = await runBlogDraftGeneration(mockDb([]), { count: 3 });
  check(
    "failure safety: no synthetic articles, warning recorded",
    none.generatedCount === 0 && none.failedCount === 3 && none.drafts.length === 0 && none.warnings.length === 1,
  );

  // O/P. Earlier stages intact
  check(
    "O AG-1/AG-2/AG-3 protections intact",
    isGovernedOnly("self_optimization_agent") &&
      isGovernedOnly("internal_linking_engine") &&
      isGovernedOnly("google_performance_agent") &&
      !hasRunner("self_optimization_agent") &&
      !hasRunner("internal_linking_engine") &&
      !hasRunner("google_performance_agent"),
  );
  check(
    "P analytics_agent and revenue_agent unchanged",
    EXECUTABLE_AGENTS["analytics_agent"]?.mode === "read_only" &&
      EXECUTABLE_AGENTS["revenue_agent"]?.mode === "read_only" &&
      !isGovernedOnly("revenue_agent"),
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
};

await run();
