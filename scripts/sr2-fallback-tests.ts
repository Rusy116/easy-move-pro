// SR-2 fail-safe delivery tests — `bun run scripts/sr2-fallback-tests.ts`
import {
  deliverSitemap,
  type SnapshotRecord,
} from "../src/lib/seo/sitemap-delivery.server";
import { buildUrlsetXml, type SitemapEntry } from "../src/lib/seo/sitemap-xml";

let passed = 0;
const failures: string[] = [];

function cityEntries(n: number, offset = 0): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  for (let i = offset; i < offset + n; i++) {
    out.push({ path: `/moving-calculator-city-${i}-ny` });
    out.push({ path: `/movers/city-${i}-ny` });
  }
  return out;
}

const HEALTHY_XML = buildUrlsetXml(cityEntries(1000));
const SNAPSHOT: SnapshotRecord = {
  releaseId: "sitemap-release-test",
  xml: buildUrlsetXml(cityEntries(1000)),
  urlCount: 2000,
  cityUrlCount: 2000,
  createdAt: new Date().toISOString(),
};

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    console.log(`FAIL  ${name}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

const deliver = (buildLive: () => Promise<string>, snapshot: SnapshotRecord | null) =>
  deliverSitemap({
    partKey: "cities-1",
    kind: "cities",
    buildLive,
    loadSnapshot: async () => snapshot,
  });

await check("A. healthy database → live sitemap served", async () => {
  const res = await deliver(async () => HEALTHY_XML, SNAPSHOT);
  eq(res.status, 200, "status");
  eq(res.headers.get("X-Sitemap-Source"), "live", "source");
  eq(res.headers.get("Content-Type"), "application/xml", "content-type");
  eq(await res.text(), HEALTHY_XML, "body");
});

await check("B. database failure → last-known-good served", async () => {
  const res = await deliver(async () => {
    throw new Error("connection refused");
  }, SNAPSHOT);
  eq(res.status, 200, "status");
  eq(res.headers.get("X-Sitemap-Source"), "last_known_good", "source");
  eq(await res.text(), SNAPSHOT.xml, "body identical to snapshot");
});

await check("B2. database timeout → last-known-good served", async () => {
  const res = await deliverSitemap({
    partKey: "cities-1",
    kind: "cities",
    timeoutMs: 50,
    buildLive: () => new Promise<string>((r) => setTimeout(() => r(HEALTHY_XML), 500)),
    loadSnapshot: async () => SNAPSHOT,
  });
  eq(res.status, 200, "status");
  eq(res.headers.get("X-Sitemap-Source"), "last_known_good", "source");
});

await check("C. zero-city result → last-known-good served", async () => {
  const res = await deliver(async () => buildUrlsetXml([]), SNAPSHOT);
  eq(res.headers.get("X-Sitemap-Source"), "last_known_good", "source");
  eq(await res.text(), SNAPSHOT.xml, "body");
});

await check("D. malformed live XML → last-known-good served", async () => {
  const res = await deliver(async () => HEALTHY_XML.replace("</urlset>", ""), SNAPSHOT);
  eq(res.headers.get("X-Sitemap-Source"), "last_known_good", "source");
});

await check("D2. wrong-domain live XML → last-known-good served", async () => {
  const bad = HEALTHY_XML.replace("https://www.easymove.pro/movers/city-0-ny", "https://preview.lovable.app/movers/city-0-ny");
  const res = await deliver(async () => bad, SNAPSHOT);
  eq(res.headers.get("X-Sitemap-Source"), "last_known_good", "source");
});

await check("E. >5% shrink → last-known-good served", async () => {
  const res = await deliver(async () => buildUrlsetXml(cityEntries(900)), SNAPSHOT);
  eq(res.headers.get("X-Sitemap-Source"), "last_known_good", "source");
});

await check("E2. small safe change (<5%) → live served", async () => {
  const res = await deliver(async () => buildUrlsetXml(cityEntries(980)), SNAPSHOT);
  eq(res.headers.get("X-Sitemap-Source"), "live", "source");
});

await check("F. no snapshot + failed live → 5xx, not empty XML", async () => {
  const res = await deliver(async () => {
    throw new Error("database paused");
  }, null);
  eq(res.status, 503, "status");
  const body = await res.text();
  if (body.includes("<urlset")) throw new Error("returned XML instead of an error");
  if (/paused|database/i.test(body)) throw new Error("leaked internal error detail");
});

await check("F2. no snapshot + zero rows → 5xx for a known part", async () => {
  const res = await deliver(async () => buildUrlsetXml([]), null);
  eq(res.status, 503, "status");
});

await check("G. unused partition (empty live, no snapshot, allowed) → 200 empty as before", async () => {
  const res = await deliverSitemap({
    partKey: "cities-9",
    kind: "cities",
    emptyAllowedWhenNoSnapshot: true,
    buildLive: async () => buildUrlsetXml([]),
    loadSnapshot: async () => null,
  });
  eq(res.status, 200, "status");
  eq(res.headers.get("X-Sitemap-Source"), "live", "source");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.log(` - ${f}`));
  process.exit(1);
}
