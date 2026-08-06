// Server-only: AI copy generation for the City Landing & Calculator Agent.
// Uses the Lovable AI Gateway Responses API (streaming, per platform rules).
import type { CityFacts } from "./city-landing/data";
import {
  buildCityLandingContent,
  type CityLandingContent,
  type CityFaqItem,
} from "./city-landing/content";

const MODEL = "openai/gpt-5.6-sol";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    intro: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 4 },
    guide_paragraphs: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 4 },
    pricing_paragraphs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
    local_recommendations: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 8 },
    extra_faq: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
      },
    },
    meta_description: { type: "string" },
  },
  required: [
    "intro",
    "guide_paragraphs",
    "pricing_paragraphs",
    "local_recommendations",
    "extra_faq",
    "meta_description",
  ],
} as const;

interface AiPayload {
  intro: string[];
  guide_paragraphs: string[];
  pricing_paragraphs: string[];
  local_recommendations: string[];
  extra_faq: CityFaqItem[];
  meta_description: string;
}

/**
 * Generate localized copy for one city. Falls back to the deterministic
 * builder when no API key is configured or the model call fails — the page is
 * always complete, AI only makes it more unique.
 */
export async function generateCityContent(
  facts: CityFacts,
): Promise<{ content: CityLandingContent; source: "ai" | "template" }> {
  const base = buildCityLandingContent(facts);
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { content: base, source: "template" };

  const prompt = [
    `Write unique, human, genuinely useful local moving content for ${facts.city}, ${facts.stateName} (${facts.stateCode}).`,
    `Facts you must use naturally (no keyword stuffing, no invented statistics):`,
    `- County: ${facts.county ?? "unknown"}`,
    `- Population: ${facts.population.toLocaleString()}`,
    `- Time zone: ${facts.timezone}`,
    `- Neighborhoods: ${facts.neighborhoods.join(", ")}`,
    `- Major highways: ${facts.highways.join(", ") || "unknown"}`,
    `- Nearby cities: ${facts.nearbyCities.map((n) => n.name).join(", ")}`,
    `- Average local move prices: studio $${facts.averages.studio}, 2BR $${facts.averages.twoBed}, 3BR house $${facts.averages.house}, hourly $${facts.averages.hourly}`,
    ``,
    `Return JSON with: intro (3 paragraphs introducing moving in this city and the instant calculator),`,
    `guide_paragraphs (3 paragraphs of a practical local moving guide: access, parking, buildings, traffic),`,
    `pricing_paragraphs (2 paragraphs explaining what drives local vs long-distance pricing in this city),`,
    `local_recommendations (short practical local tips), extra_faq (questions a real ${facts.city} resident would ask, distinct from generic ones),`,
    `and meta_description (140-160 characters, includes the city and "moving calculator").`,
    `Tone: expert, plain English, no fluff, no fabricated awards or testimonials. Never invent regulations you are unsure about.`,
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "city_landing_copy",
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${detail.slice(0, 200)}`);
    }

    const text = await readOutputText(res.body);
    const payload = JSON.parse(text) as AiPayload;
    return { content: mergeContent(base, payload), source: "ai" };
  } catch (err) {
    // Never fail the page: keep the deterministic content and surface the note.
    console.error("[city-landing] AI generation fell back to template:", err);
    return { content: base, source: "template" };
  }
}

async function readOutputText(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const evt = JSON.parse(raw) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          out += evt.delta;
        } else if (evt.type === "response.completed" && evt.response?.output_text) {
          if (!out) out = evt.response.output_text;
        }
      } catch {
        /* ignore keepalive frames */
      }
    }
  }
  if (!out.trim()) throw new Error("Empty AI response");
  return out;
}

function mergeContent(base: CityLandingContent, ai: AiPayload): CityLandingContent {
  const sections = base.sections.map((s, i) => {
    if (i === 0) return { ...s, paragraphs: [...ai.pricing_paragraphs, ...s.paragraphs] };
    if (i === 1) return { ...s, paragraphs: [...ai.guide_paragraphs, ...s.paragraphs.slice(1)] };
    return s;
  });
  const seen = new Set(base.faq.map((f) => f.q.toLowerCase()));
  const extra = ai.extra_faq.filter((f) => f.q && f.a && !seen.has(f.q.toLowerCase()));
  return {
    ...base,
    metaDescription:
      ai.meta_description && ai.meta_description.length <= 175
        ? ai.meta_description
        : base.metaDescription,
    intro: ai.intro.length ? ai.intro : base.intro,
    sections,
    faq: [...base.faq, ...extra],
    recommendations: [...ai.local_recommendations, ...base.recommendations].slice(0, 10),
  };
}
