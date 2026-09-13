/* eslint-disable @typescript-eslint/no-explicit-any */
// PF-1 verification suite. No production data is touched: every database and
// storage call is a local in-memory stub.
import { checkDuplicate, similarity } from "../src/lib/pdf-store/duplicate";
import { generateAndVerifyArtifact, isPdfPayload, artifactPath } from "../src/lib/pdf-store/artifact.server";
import { runPdfStage } from "../src/lib/pdf-factory.server";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

const product = {
  id: "p1",
  slug: "eight-week-moving-checklist",
  title: "The 8-Week Moving Checklist",
  subtitle: "Plan every week",
  version: "1.0",
  language: "en",
  cover_spec: { palette: ["#0f3d3e", "#7cc4b0"], motif: "boxes", layout: "stack" },
  target_keywords: ["moving checklist 8 weeks"],
  content: Array.from({ length: 6 }, (_, i) => ({
    heading: `Section ${i + 1}`,
    body: "Body text ".repeat(20),
    items: ["one", "two", "three", "four"],
  })),
};

function makeDb(opts: {
  catalog?: any[];
  catalogError?: any;
  uploadError?: any;
  downloadPayload?: Uint8Array | null;
  downloadError?: any;
} = {}) {
  const store = new Map<string, Uint8Array>();
  const writes: any[] = [];
  return {
    writes,
    store,
    from(table: string) {
      const api: any = {
        select: () => api,
        in: () => api,
        eq: () => api,
        neq: () => api,
        limit: async () =>
          table === "pdf_products"
            ? { data: opts.catalog ?? [], error: opts.catalogError ?? null }
            : { data: [], error: null },
        maybeSingle: async () => ({ data: null }),
        update: (patch: any) => { writes.push({ table, patch }); return api; },
        insert: async (row: any) => { writes.push({ table, row }); return { data: null, error: null }; },
      };
      return api;
    },
    storage: {
      from() {
        return {
          async upload(path: string, bytes: Uint8Array) {
            if (opts.uploadError) return { error: opts.uploadError };
            store.set(path, bytes);
            return { error: null };
          },
          async download(path: string) {
            if (opts.downloadError) return { data: null, error: opts.downloadError };
            const payload = opts.downloadPayload !== undefined ? opts.downloadPayload : store.get(path) ?? null;
            if (!payload) return { data: null, error: { message: "not found" } };
            return { data: { arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) }, error: null };
          },
        };
      },
    },
  } as any;
}

const job = { id: "j1", product_slug: product.slug, title: product.title, category_slug: "checklists", brief: null, stage: 11 };

async function main() {
  console.log("PF-1 tests\n");

  // A — exact duplicate protection
  check("A exact title duplicate scores 1", similarity({ title: "Moving Budget Worksheet" }, { title: "moving budget worksheet" }) === 1);
  const exact = checkDuplicate(
    { slug: "moving-budget-worksheet-2", title: "Moving Budget Worksheet" },
    [{ id: "x", slug: "moving-budget-worksheet", title: "Moving Budget Worksheet" }],
  );
  check("A exact duplicate blocked", exact.passed === false && exact.closestProductId === "x");

  // B — near duplicate blocked
  const near = checkDuplicate(
    { slug: "room-by-room-packing-checklist", title: "Room by Room Packing Checklist" },
    [{ id: "y", slug: "room-by-room-packing-list", title: "Room-by-Room Packing List" }],
  );
  check("B near-duplicate blocked", near.passed === false, `score ${near.similarityScore}`);

  // C — different product not blocked
  const diff = checkDuplicate(
    { slug: "office-relocation-plan-template", title: "Office Relocation Plan Template" },
    [
      { id: "y", slug: "senior-downsizing-checklist", title: "Senior Downsizing Checklist" },
      { id: "z", slug: "moving-with-pets-checklist", title: "Moving With Pets: Complete Checklist" },
    ],
  );
  check("C distinct product passes", diff.passed === true, `score ${diff.similarityScore}`);
  const generic = checkDuplicate(
    { slug: "moving-day-timeline-planner", title: "Moving Day Hour-by-Hour Timeline" },
    [{ id: "y", slug: "long-distance-move-planner", title: "Long-Distance Move Planner" }],
  );
  check("C shared generic words do not block", generic.passed === true, `score ${generic.similarityScore}`);

  // D–H — artifact deliverability
  const okDb = makeDb();
  const good = await generateAndVerifyArtifact(okDb, product);
  check("H valid artifact verified", good.ready && good.verified && good.bytes > 2048, good.error ?? "");
  check("H artifact path deterministic", good.path === artifactPath(product.slug, "1.0"));

  const upFail = await generateAndVerifyArtifact(makeDb({ uploadError: { message: "bucket down" } }), product);
  check("E upload failure blocks", !upFail.ready && /upload failed/.test(upFail.error ?? ""));

  const dlFail = await generateAndVerifyArtifact(makeDb({ downloadError: { message: "gone" } }), product);
  check("F retrieval failure blocks", !dlFail.ready && /retrieval failed/.test(dlFail.error ?? ""));

  const html = new TextEncoder().encode("<html><body>error</body></html>".repeat(200));
  const badPayload = await generateAndVerifyArtifact(makeDb({ downloadPayload: html }), product);
  check("G non-PDF stored payload blocks", !badPayload.ready && /not a PDF/.test(badPayload.error ?? ""));
  check("G pdf signature detector", isPdfPayload(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])) && !isPdfPayload(html));

  // D — publish stage cannot publish without artifact
  const blockDb = makeDb({ catalog: [], uploadError: { message: "no bucket" } });
  const blocked = await runPdfStage(blockDb, job, product);
  check("D publish blocked without verified artifact", blocked.ok === false && blocked.metrics?.blockReason === "deliverability_failed");
  check("D blocked product goes to review", (blocked.patch as any)?.status === "review");
  check("D blocked product not marked published", (blocked.patch as any)?.status !== "published");

  // I — published product references verified artifact
  const pubDb = makeDb({ catalog: [{ id: "other", slug: "other-thing", title: "Home Inventory Sheet" }] });
  const published = await runPdfStage(pubDb, job, product);
  check("I publish succeeds and stores artifact path", published.ok === true && (published.patch as any).file_url === artifactPath(product.slug, "1.0"));
  check("I file size recorded", Number((published.patch as any).file_size_kb) > 0);
  check("I metrics real", published.metrics?.pdfsGenerated === 1 && published.metrics?.pdfsVerified === 1 && published.metrics?.duplicateChecksPerformed === 1);
  check("I audit persisted", !!(published.audit as any)?.duplicateCheck && !!(published.audit as any)?.artifact);

  // B (pipeline) — duplicate blocks publication
  const dupDb = makeDb({ catalog: [{ id: "dup", slug: "8-week-moving-checklist", title: "The 8 Week Moving Checklist" }] });
  const dupStage = await runPdfStage(dupDb, job, product);
  check("B pipeline blocks duplicate", dupStage.ok === false && dupStage.metrics?.duplicateRejected === 1);

  // Duplicate check technical failure → block
  const errDb = makeDb({ catalogError: { message: "db offline" } });
  const errStage = await runPdfStage(errDb, job, product);
  check("duplicate check error blocks publish", errStage.ok === false && errStage.metrics?.blockReason === "duplicate_check_error");

  // J — old products remain downloadable (no file_url → render-on-download path)
  const { signedArtifactUrl } = await import("../src/lib/pdf-store/artifact.server");
  check("J legacy product has no artifact url", (await signedArtifactUrl(makeDb(), null)) === null);

  // K/L/M/N/O — no payment, store, city, sitemap or GSC surface touched
  const src = [
    await Bun.file("src/lib/pdf-store/artifact.server.ts").text(),
    await Bun.file("src/lib/pdf-store/duplicate.ts").text(),
  ].join("\n");
  check("K/L no Stripe or checkout references", !/stripe|checkout|price_id/i.test(src));
  check("M/N/O no city, sitemap or GSC references", !/city_landing_pages|sitemap|searchconsole/i.test(src));
  const touched = pubDb.writes.filter((w: any) => !["pdf_products", "pdf_jobs", "pdf_publish_log"].includes(w.table));
  check("only PDF factory tables written", touched.length === 0);

  // P/Q — verified demand gate untouched
  const worker = await Bun.file("src/lib/pdf-store/worker.server.ts").text();
  check("P verified-demand gate intact", /eq\("status", "candidate"\)/.test(worker) && /real_verified/.test(worker) && /approved/.test(worker));
  check("Q synthetic evidence always zero", /syntheticEvidenceUsed: 0/.test(worker));

  // R — tick report fields
  for (const field of [
    "candidatesCreated", "pdfJobsCreated", "pdfsGenerated", "pdfsVerified", "productsCreated",
    "productsPublished", "productsBlocked", "blockReasons", "duplicateRejected",
    "verifiedEvidenceUsed", "syntheticEvidenceUsed", "deliverabilityFailed", "duplicateChecksPerformed",
  ]) {
    check(`R report field ${field}`, worker.includes(`${field}:`));
  }

  // S — daily-improve cannot desync content from artifact
  const research = await Bun.file("src/lib/pdf-store/research.server.ts").text();
  check("S improve step strips PDF-affecting fields", /PF-1 safety/.test(research) && /"content", "version"/.test(research));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

void main();
