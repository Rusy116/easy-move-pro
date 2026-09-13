// SR-1 safety tests — standalone runner: `bun run scripts/sr1-validation-tests.ts`
import {
  evaluateShrinkGuard,
  validateCandidate,
  type SnapshotPart,
} from "../src/lib/seo/sitemap-snapshot";
import { buildAndPromoteSnapshot } from "../src/lib/seo/sitemap-snapshot.server";

let passed = 0;
const failures: string[] = [];
const pending: Array<[string, () => unknown | Promise<unknown>]> = [];
function describe(name: string, fn: () => void) {
  current = name;
  fn();
}
let current = "";
function it(name: string, fn: () => unknown | Promise<unknown>) {
  const label = `${current} > ${name}`;
  pending.push([label, fn]);
}
function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) throw new Error(`expected ${expected}, got ${actual}`);
    },
    rejects: {
      async toThrow(re: RegExp) {
        try {
          await actual;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!re.test(msg)) throw new Error(`error "${msg}" does not match ${re}`);
          return;
        }
        throw new Error("expected promise to reject");
      },
    },
  };
}

const ORIGIN = "https://www.easymove.pro";

function urlset(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>`)
    .join("\n")}\n</urlset>`;
}
function indexXml(files: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files
    .map((f) => `  <sitemap>\n    <loc>${ORIGIN}/${f}</loc>\n  </sitemap>`)
    .join("\n")}\n</sitemapindex>`;
}

function cityUrls(n: number, offset = 0): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const slug = `city-${i + offset}-tx`;
    out.push(`${ORIGIN}/moving-calculator-${slug}`);
    out.push(`${ORIGIN}/movers/${slug}`);
  }
  return out;
}

function candidate(cityCount: number): SnapshotPart[] {
  return [
    { partKey: "index", kind: "index", xml: indexXml(["sitemap-pages.xml", "sitemap-cities-1.xml"]) },
    { partKey: "pages", kind: "pages", xml: urlset([`${ORIGIN}/`, `${ORIGIN}/calculator`]) },
    { partKey: "cities-1", kind: "cities", xml: urlset(cityUrls(cityCount)) },
  ];
}

// --- in-memory database double -------------------------------------------
function makeDb(active: any[] = []) {
  const rows: any[] = [...active];
  const db = {
    rows,
    from() {
      const state: any = { filters: [] as Array<[string, any]>, op: null, payload: null };
      const api: any = {
        select() {
          state.op = "select";
          return api;
        },
        insert(payload: any[]) {
          rows.push(...payload);
          return Promise.resolve({ error: null });
        },
        update(payload: any) {
          state.op = "update";
          state.payload = payload;
          return api;
        },
        eq(col: string, val: any) {
          state.filters.push([col, val]);
          if (state.op === "update") {
            rows
              .filter((r) => state.filters.every(([c, v]: any) => r[c] === v))
              .forEach((r) => Object.assign(r, state.payload));
            return Promise.resolve({ error: null });
          }
          const data = rows.filter((r) => state.filters.every(([c, v]: any) => r[c] === v));
          return Promise.resolve({ data, error: null });
        },
      };
      return api;
    },
  };
  return db;
}

const lastGood = (cityUrlCount: number) => [
  {
    release_id: "sitemap-release-baseline",
    part_key: "cities-1",
    url_count: cityUrlCount,
    city_url_count: cityUrlCount,
    checksum: "x",
    byte_size: 1,
    is_active: true,
    status: "active",
  },
];

describe("SR-1 validation", () => {
  it("accepts a healthy candidate that reconciles with inventory", () => {
    const r = validateCandidate({ parts: candidate(100), publishedCityCount: 100 });
    expect(r.ok).toBe(true);
    expect(r.totals.cityUrlCount).toBe(200);
  });

  it("blocks an empty city sitemap", () => {
    const parts = candidate(0);
    const r = validateCandidate({ parts, publishedCityCount: 100 });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "empty")).toBe(true);
    expect(r.issues.some((i) => i.code === "no_city_urls")).toBe(true);
  });

  it("blocks malformed XML", () => {
    const parts = candidate(5);
    parts[2].xml = parts[2].xml.replace("</urlset>", "");
    const r = validateCandidate({ parts, publishedCityCount: 5 });
    expect(r.issues.some((i) => i.code === "invalid_xml")).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("blocks non-production and wrong-domain URLs", () => {
    const parts = candidate(5);
    parts[2].xml = urlset([
      ...cityUrls(5),
      "https://preview--x.lovable.app/movers/austin-tx",
      "http://localhost:8080/movers/dallas-tx",
    ]);
    const r = validateCandidate({ parts, publishedCityCount: 5 });
    expect(r.issues.some((i) => i.code === "forbidden_host")).toBe(true);
    expect(r.issues.some((i) => i.code === "non_canonical_url")).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("blocks duplicate URLs", () => {
    const parts = candidate(5);
    const dupes = cityUrls(5);
    parts[2].xml = urlset([...dupes, dupes[0]]);
    const r = validateCandidate({ parts, publishedCityCount: 5 });
    expect(r.issues.some((i) => i.code === "duplicate_url")).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("blocks a candidate that does not reconcile with published inventory", () => {
    const r = validateCandidate({ parts: candidate(50), publishedCityCount: 100 });
    expect(r.issues.some((i) => i.code === "reconcile_failed")).toBe(true);
  });
});

describe("SR-1 shrink guard", () => {
  it("hard-blocks zero city URLs", () => {
    const g = evaluateShrinkGuard({
      candidateCityUrlCount: 0,
      candidateUrlCount: 10,
      lastGoodCityUrlCount: 57700,
      lastGoodUrlCount: 57928,
    });
    expect(g.allowed).toBe(false);
  });

  it("blocks a drop larger than 5%", () => {
    const g = evaluateShrinkGuard({
      candidateCityUrlCount: 50000,
      candidateUrlCount: 50200,
      lastGoodCityUrlCount: 57700,
      lastGoodUrlCount: 57928,
    });
    expect(g.allowed).toBe(false);
    expect(g.requiresApproval).toBe(true);
  });

  it("allows a large drop only with explicit admin approval", () => {
    const g = evaluateShrinkGuard({
      candidateCityUrlCount: 50000,
      candidateUrlCount: 50200,
      lastGoodCityUrlCount: 57700,
      lastGoodUrlCount: 57928,
      adminApprovedShrink: true,
    });
    expect(g.allowed).toBe(true);
  });

  it("allows normal small growth or drift", () => {
    const g = evaluateShrinkGuard({
      candidateCityUrlCount: 57690,
      candidateUrlCount: 57918,
      lastGoodCityUrlCount: 57700,
      lastGoodUrlCount: 57928,
    });
    expect(g.allowed).toBe(true);
  });
});

describe("SR-1 failure safety", () => {
  it("promotes a healthy candidate", async () => {
    const db = makeDb();
    const out = await buildAndPromoteSnapshot(db as any, {
      publishedCityCount: 100,
      capture: async () => candidate(100),
    });
    expect(out.promoted).toBe(true);
    expect(db.rows.filter((r) => r.is_active).length).toBe(3);
  });

  it("never overwrites last-known-good when the candidate is empty", async () => {
    const db = makeDb(lastGood(57700));
    const out = await buildAndPromoteSnapshot(db as any, {
      publishedCityCount: 100,
      capture: async () => candidate(0),
    });
    expect(out.promoted).toBe(false);
    const active = db.rows.filter((r) => r.is_active);
    expect(active.length).toBe(1);
    expect(active[0].release_id).toBe("sitemap-release-baseline");
  });

  it("never overwrites last-known-good on a >5% shrink", async () => {
    const db = makeDb(lastGood(200));
    const out = await buildAndPromoteSnapshot(db as any, {
      publishedCityCount: 80,
      capture: async () => candidate(80),
    });
    expect(out.promoted).toBe(false);
    expect(db.rows.filter((r) => r.is_active)[0].release_id).toBe("sitemap-release-baseline");
  });

  it("throws and writes nothing when the capture fails", async () => {
    const db = makeDb(lastGood(57700));
    await expect(
      buildAndPromoteSnapshot(db as any, {
        publishedCityCount: 100,
        capture: async () => {
          throw new Error("database read timed out");
        },
      }),
    ).rejects.toThrow(/capture failed/i);
    expect(db.rows.length).toBe(1);
    expect(db.rows[0].is_active).toBe(true);
  });
});

for (const [label, fn] of pending) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${label}`);
  } catch (e) {
    failures.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    console.log(`FAIL  ${label} — ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
