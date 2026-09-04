/**
 * Site-wide i18n completeness check (dev/CI only).
 *
 *  1. Every key present in EN must exist in RU and ES (and vice versa).
 *  2. RU/ES values must not silently mirror EN, except allow-listed proper names.
 *  3. Every `t("...")` key used in the app must exist in all three dictionaries.
 *
 * Run: bun scripts/i18n-modules-check.ts
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { en } from "../src/i18n/locales/en";
import { es } from "../src/i18n/locales/es";
import { ru } from "../src/i18n/locales/ru";
import { adminEn, adminRu, adminEs } from "../src/i18n/admin";
import { modulesEn, modulesRu, modulesEs } from "../src/i18n/modules";

const EN: Record<string, string> = { ...en, ...adminEn, ...modulesEn };
const RU: Record<string, string> = { ...ru, ...adminRu, ...modulesRu };
const ES: Record<string, string> = { ...es, ...adminEs, ...modulesEs };

/** Identical across locales on purpose (brands, acronyms, symbols). */
const SAME_ALLOWED = /^(Easy Move Pro|Easy Moving|Stripe|Supabase|Google|Resend|Twilio|SEO|CRM|AI|PDF|CSV|URL|ID|API|OK|MRR|LTV|CTR|Email|—|%|\W*|\d+.*)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

let failures = 0;
const report = (label: string, items: string[]) => {
  console.log(`${items.length === 0 ? "PASS" : "FAIL"}  ${label}: ${items.length}`);
  if (items.length) {
    failures += items.length;
    console.log(items.slice(0, 30).map((i) => `        ${i}`).join("\n"));
  }
};

// 1 — key parity ------------------------------------------------------------
const allKeys = new Set([...Object.keys(EN), ...Object.keys(RU), ...Object.keys(ES)]);
report("keys missing in EN", [...allKeys].filter((k) => !(k in EN)));
report("keys missing in RU", [...allKeys].filter((k) => !(k in RU)));
report("keys missing in ES", [...allKeys].filter((k) => !(k in ES)));

// 2 — untranslated mirrors --------------------------------------------------
const mirrored = (dict: Record<string, string>) =>
  Object.keys(EN).filter(
    (k) => dict[k] === EN[k] && EN[k].length > 3 && !SAME_ALLOWED.test(EN[k]),
  );
report("RU values identical to EN", mirrored(RU));
report("ES values identical to EN", mirrored(ES));

// 3 — used keys exist -------------------------------------------------------
const files = [...walk("src/routes"), ...walk("src/components")];
const unknown: string[] = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\b(?:t|tr)\(\s*"([a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+)"/g)) {
    if (!(m[1] in EN)) unknown.push(`${m[1]} (${f})`);
  }
}
report("t() keys with no dictionary entry", [...new Set(unknown)]);

console.log(`\nEN ${Object.keys(EN).length} · RU ${Object.keys(RU).length} · ES ${Object.keys(ES).length}`);
console.log(failures === 0 ? "\nAll i18n checks passed." : `\n${failures} issue(s) found.`);
