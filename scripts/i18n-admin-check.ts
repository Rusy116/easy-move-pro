/**
 * Admin i18n completeness check (dev/CI only).
 *
 * 1. Every admin translation key must exist in EN, RU and ES.
 * 2. RU/ES values must not silently mirror EN (except allow-listed proper names).
 * 3. Admin JSX/TSX must not contain obvious hardcoded user-visible English.
 *
 * Run: bun scripts/i18n-admin-check.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

/** Words that are identical across locales and therefore allowed to match EN. */
const SAME_WORD_ALLOWLIST = new Set([
  "Easy Moving",
  "Easy Move Pro",
  "Stripe",
  "Supabase",
  "SEO",
  "AI",
  "PDF",
  "CSV",
  "URL",
  "ID",
  "Email",
  "OK",
  "—",
  "%",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

async function loadDicts() {
  const mod = await import("../src/i18n/admin/index.ts");
  return mod as unknown as {
    adminEn: Record<string, string>;
    adminRu: Record<string, string>;
    adminEs: Record<string, string>;
  };
}

const ADMIN_FILE_GLOBS = [
  join(ROOT, "src/routes/_authenticated"),
  join(ROOT, "src/components/admin"),
  join(ROOT, "src/components/ai"),
  join(ROOT, "src/components/shell"),
];

const ADMIN_FILE_FILTER = (f: string) =>
  /\/(admin|ai)\.[^/]+\.tsx$/.test(f) ||
  f.includes("/components/admin/") ||
  f.includes("/components/ai/") ||
  f.includes("/components/shell/");

/** Heuristic: JSX text / attribute literals that look like English sentences. */
const HARDCODED_PATTERNS: RegExp[] = [
  />\s*([A-Z][A-Za-z]+(?:\s+[A-Za-z&,'’-]+){1,10})\s*</g,
  /(?:placeholder|title|aria-label|label)\s*=\s*"([A-Z][^"]{3,})"/g,
  /toast\.(?:success|error|info|warning)\(\s*"([^"]{3,})"/g,
];

const IGNORE_LINE = /(^\s*\/\/|console\.|head:|meta:|import |from "|queryKey|\.from\(|=== "|case ")/;

async function main() {
  const { adminEn, adminRu, adminEs } = await loadDicts();
  const problems: string[] = [];

  const keys = new Set([
    ...Object.keys(adminEn),
    ...Object.keys(adminRu),
    ...Object.keys(adminEs),
  ]);

  let missing = 0;
  let mirrored = 0;
  for (const key of keys) {
    for (const [name, dict] of [
      ["EN", adminEn],
      ["RU", adminRu],
      ["ES", adminEs],
    ] as const) {
      if (!dict[key]) {
        problems.push(`MISSING ${name}: ${key}`);
        missing += 1;
      }
    }
    for (const [name, dict] of [
      ["RU", adminRu],
      ["ES", adminEs],
    ] as const) {
      const en = adminEn[key];
      const other = dict[key];
      if (en && other && en === other && !SAME_WORD_ALLOWLIST.has(en)) {
        problems.push(`MIRRORS EN in ${name}: ${key} = "${en}"`);
        mirrored += 1;
      }
    }
  }

  const files = ADMIN_FILE_GLOBS.flatMap((d) => {
    try {
      return walk(d);
    } catch {
      return [];
    }
  }).filter(ADMIN_FILE_FILTER);

  let hardcoded = 0;
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    src.split("\n").forEach((line, i) => {
      if (IGNORE_LINE.test(line)) return;
      for (const re of HARDCODED_PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(line))) {
          const text = m[1].trim();
          if (!/[a-z]/.test(text)) continue;
          if (/^[A-Z][a-z]+$/.test(text)) continue; // single capitalised word (often a component)
          if (/[{}$<>]/.test(text)) continue;
          problems.push(`HARDCODED ${file.replace(ROOT, "")}:${i + 1} → "${text}"`);
          hardcoded += 1;
        }
      }
    });
  }

  console.log(`Admin i18n keys: ${keys.size}`);
  console.log(`Missing translations: ${missing}`);
  console.log(`RU/ES mirroring EN: ${mirrored}`);
  console.log(`Possible hardcoded English strings: ${hardcoded}`);
  if (problems.length) {
    console.log("\n--- details ---");
    for (const p of problems) console.log(p);
  }
  if (missing > 0) process.exitCode = 1;
}

void main();
