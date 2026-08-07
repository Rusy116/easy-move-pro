// ---------------------------------------------------------------------------
// PHASE 14 — Product naming (pure).
//
// The planner used to emit stuttering titles ("The Moving Moving Kit") because
// the keyword already contained the cluster word. These helpers normalise a
// title, remove repeated words, drop filler and guarantee uniqueness across
// the catalog. No I/O — safe on the client and the server.
// ---------------------------------------------------------------------------
import { slugify } from "./catalog";

const FILLER = /\b(pdf|printable|free|template|templates|download|downloadable)\b/gi;

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "with",
]);

/** Title case that leaves small words lowercase unless they lead. */
export function titleCase(input: string) {
  const words = input.trim().split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Collapse any word that repeats consecutively or twice in the same title. */
export function dedupeWords(input: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of input.split(/\s+/)) {
    const key = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out.join(" ");
}

/**
 * Turn any raw keyword or AI suggestion into a clean, human product title.
 * Never returns a stuttering or filler-heavy name.
 */
export function cleanTitle(raw: string, fallbackNoun = "Moving Kit") {
  const stripped = String(raw ?? "")
    .replace(/["'“”]/g, "")
    .replace(FILLER, " ")
    .replace(/[^A-Za-z0-9&/\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const deduped = dedupeWords(stripped);
  const cased = titleCase(deduped);
  const words = cased.split(" ").filter(Boolean);
  if (words.length < 2) return titleCase(`${cased} ${fallbackNoun}`.trim());
  return words.slice(0, 10).join(" ").slice(0, 80);
}

const DESCRIPTORS = [
  "Complete Edition",
  "2026 Edition",
  "Pro Edition",
  "Room-by-Room Edition",
  "Family Edition",
  "Long-Distance Edition",
  "Apartment Edition",
  "Express Edition",
];

/**
 * Guarantee a unique, still-readable title. `taken` holds slugs already used
 * anywhere in the catalog, backlog or queue and is mutated on success.
 */
export function uniqueTitle(base: string, taken: Set<string>) {
  const clean = cleanTitle(base);
  if (!taken.has(slugify(clean))) {
    taken.add(slugify(clean));
    return clean;
  }
  for (const d of DESCRIPTORS) {
    const candidate = `${clean} — ${d}`;
    if (!taken.has(slugify(candidate))) {
      taken.add(slugify(candidate));
      return candidate;
    }
  }
  for (let n = 2; n < 40; n++) {
    const candidate = `${clean} v${n}`;
    if (!taken.has(slugify(candidate))) {
      taken.add(slugify(candidate));
      return candidate;
    }
  }
  return `${clean} ${Date.now().toString(36)}`;
}

/** True when a stored title still shows the legacy stuttering pattern. */
export function needsRename(title: string) {
  const words = String(title ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  const seen = new Set<string>();
  for (const w of words) {
    if (seen.has(w)) return true;
    seen.add(w);
  }
  return false;
}
