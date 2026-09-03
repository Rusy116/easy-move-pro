import { adminEn, adminRu, adminEs } from "../src/i18n/admin";
import { readFileSync } from "fs";
import { execSync } from "child_process";
const en = await import("../src/i18n/locales/en");
const ru = await import("../src/i18n/locales/ru");
const es = await import("../src/i18n/locales/es");
const E = { ...(en as any).en, ...adminEn }, R = { ...(ru as any).ru, ...adminRu }, S = { ...(es as any).es, ...adminEs };
const files = execSync(`rg -l "" src/routes/_authenticated src/components/admin src/components/ai src/components/shell -g '*.tsx'`).toString().trim().split('\n');
const missing: string[] = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\b(?:t|tr)\(\s*"([a-zA-Z0-9_.]+)"/g)) {
    const k = m[1];
    if (!k.includes('.')) continue;
    for (const [n, d] of [["en", E], ["ru", R], ["es", S]] as const) if (!(k in d)) missing.push(`${n} ${k} (${f})`);
  }
}
console.log("missing:", missing.length);
console.log(missing.slice(0, 40).join('\n'));
