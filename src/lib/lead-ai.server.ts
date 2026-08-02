export interface LeadAiSummary {
  complexity: string;
  complexity_score: number;
  risk_score: number;
  customer_requests: string[];
  pricing_recommendation: string;
  follow_up_recommendation: string;
  headline: string;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SCHEMA_HINT = `Return STRICT JSON only, no markdown, shaped:
{"headline":string,"complexity":"low"|"medium"|"high","complexity_score":number(0-100),"risk_score":number(0-100),"customer_requests":string[],"pricing_recommendation":string,"follow_up_recommendation":string}`;

export async function generateLeadSummary(lead: Record<string, unknown>): Promise<LeadAiSummary> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this environment.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a senior moving-broker analyst. Analyse a moving lead and produce a compact operational summary for the broker. ${SCHEMA_HINT}`,
        },
        { role: "user", content: JSON.stringify(lead) },
      ],
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached — try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned) as LeadAiSummary;
  return {
    headline: parsed.headline ?? "",
    complexity: parsed.complexity ?? "medium",
    complexity_score: Number(parsed.complexity_score ?? 50),
    risk_score: Number(parsed.risk_score ?? 50),
    customer_requests: Array.isArray(parsed.customer_requests) ? parsed.customer_requests : [],
    pricing_recommendation: parsed.pricing_recommendation ?? "",
    follow_up_recommendation: parsed.follow_up_recommendation ?? "",
  };
}
