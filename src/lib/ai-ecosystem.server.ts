// ---------------------------------------------------------------------------
// Server-only AI helpers for the ecosystem agents (Blog, Growth, Product).
// Uses the Lovable AI Gateway Responses API in streaming mode.
// ---------------------------------------------------------------------------

const MODEL = "openai/gpt-5.6-sol";

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
        } else if (evt.type === "response.completed" && evt.response?.output_text && !out) {
          out = evt.response.output_text;
        }
      } catch {
        /* keepalive frame */
      }
    }
  }
  if (!out.trim()) throw new Error("Empty AI response");
  return out;
}

/**
 * Generate a JSON object matching `schema`. Returns null (never throws) so the
 * calling agent can fall back to its deterministic template.
 */
export async function generateJson<T>(
  name: string,
  schema: Record<string, unknown>,
  prompt: string,
): Promise<T | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
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
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${detail.slice(0, 200)}`);
    }
    return JSON.parse(await readOutputText(res.body)) as T;
  } catch (err) {
    console.error(`[ai-ecosystem] ${name} generation fell back to template:`, err);
    return null;
  }
}
