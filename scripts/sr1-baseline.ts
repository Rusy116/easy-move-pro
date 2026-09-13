// SR-1 one-off: capture the current verified production sitemaps, validate
// them, and emit SQL that stores them as the initial Last-Known-Good release.
import { writeFileSync } from "node:fs";
import { captureLiveSitemaps } from "../src/lib/seo/sitemap-snapshot.server";
import { newReleaseId, validateCandidate } from "../src/lib/seo/sitemap-snapshot";

const publishedCityCount = Number(process.argv[2] ?? "0");
if (!publishedCityCount) throw new Error("publishedCityCount argument required");

const parts = await captureLiveSitemaps();
const v = validateCandidate({ parts, publishedCityCount });
console.log(JSON.stringify({ ok: v.ok, totals: v.totals, issues: v.issues.slice(0, 10) }, null, 2));
for (const a of v.analyses) {
  console.log(`${a.partKey}\turls=${a.urlCount}\tcity=${a.cityUrlCount}\tbytes=${a.byteSize}\t${a.checksum}`);
}
if (!v.ok) {
  console.error("BLOCKED — no baseline written");
  process.exit(1);
}

const releaseId = newReleaseId();
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const values = v.analyses
  .map(
    (a) =>
      `(${q(releaseId)}, ${q(a.partKey)}, ${q(a.xml)}, ${a.urlCount}, ${a.cityUrlCount}, ${q(a.checksum)}, ${a.byteSize}, 'active', true, ${q(
        JSON.stringify({
          kind: a.kind,
          origin: "https://easymove.pro",
          published_city_count: publishedCityCount,
          baseline: true,
          source: "live-production-capture",
        }),
      )}::jsonb)`,
  )
  .join(",\n");
writeFileSync(
  "/tmp/sr1-baseline.sql",
  `BEGIN;\nUPDATE public.sitemap_snapshots SET is_active=false, status='superseded' WHERE is_active;\nINSERT INTO public.sitemap_snapshots (release_id, part_key, xml, url_count, city_url_count, checksum, byte_size, status, is_active, metadata) VALUES\n${values};\nCOMMIT;\n`,
);
console.log("release:", releaseId);
