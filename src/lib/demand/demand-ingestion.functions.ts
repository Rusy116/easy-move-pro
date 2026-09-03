// ---------------------------------------------------------------------------
// DD-3 — Admin-only, manual Google Search Console demand ingestion.
//
// Writes REAL GSC observations into public.demand_signals only.
// Does NOT create pdf_keywords / pdf_opportunities / pdf_jobs / pdf_products.
// Does NOT call AI, DataForSEO, or any fallback source.
//
// GSC impressions describe how often easymove.pro was SHOWN for a query.
// They are not search volume, monthly searches, or market size.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchQueryRows, resolveVerifiedProperty } from "./providers/gsc.server";

const PROPERTY = "sc-domain:easymove.pro";
const GEO = "US";
const HARD_MAX_ROWS = 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Input = { startDate: string; endDate: string; maxRows?: number };

function validate(data: unknown): Input {
  const d = (data ?? {}) as Record<string, unknown>;
  const startDate = String(d.startDate ?? "");
  const endDate = String(d.endDate ?? "");
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    throw new Error("startDate and endDate must be YYYY-MM-DD");
  }
  if (startDate > endDate) throw new Error("startDate must be before endDate");

  // No future dates, and no incomplete (too recent) dates for this controlled run.
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  if (endDate >= todayIso) throw new Error("endDate must be in the past (complete dates only)");
  const latestComplete = new Date(today.getTime() - 3 * 86_400_000).toISOString().slice(0, 10);
  if (endDate > latestComplete) {
    throw new Error("endDate is too recent; Search Console data is not complete yet");
  }

  const maxRows = Math.min(Math.max(Number(d.maxRows ?? HARD_MAX_ROWS) || HARD_MAX_ROWS, 1), HARD_MAX_ROWS);
  return { startDate, endDate, maxRows };
}

export const fetchGscDemandSignals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const supabase = (context as any).supabase;
    const userId = (context as any).userId as string;

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Authorization check failed");
    if (!isAdmin) throw new Error("Forbidden");

    const { startDate, endDate, maxRows } = data;

    // Provider call — hard failure policy, no fallback rows on error.
    const siteUrl = await resolveVerifiedProperty(PROPERTY);
    const rows = await fetchQueryRows({ siteUrl, startDate, endDate, rowLimit: maxRows! });

    const collectedAt = new Date().toISOString();
    const sourceReference = {
      provider: "google_search_console",
      property: PROPERTY,
      dimensions: ["query"],
      window_start: startDate,
      window_end: endDate,
      data_state: "complete",
    };

    // Deduplicate on the same unique boundary the DB enforces.
    const byNorm = new Map<string, (typeof rows)[number]>();
    for (const r of rows) byNorm.set(r.query.toLowerCase().trim(), r);

    const payload = Array.from(byNorm.values()).map((r) => ({
      query: r.query,
      source: "gsc",
      collected_at: collectedAt,
      window_start: startDate,
      window_end: endDate,
      geo: GEO,
      // Real GSC metrics only.
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      avg_position: r.position,
      // GSC cannot supply these — they must remain NULL.
      search_volume: null,
      trend_delta_90: null,
      cpc_cents: null,
      competition: null,
      source_reference: sourceReference,
    }));

    let storedCount = 0;
    if (payload.length > 0) {
      const { data: upserted, error } = await supabase
        .from("demand_signals")
        .upsert(payload, { onConflict: "query_norm,source,window_start,geo" })
        .select("id");
      if (error) throw new Error(`Storing demand signals failed: ${error.message}`);
      storedCount = upserted?.length ?? 0;
    }

    return {
      property: PROPERTY,
      window: { start: startDate, end: endDate, geo: GEO, dataState: "complete" },
      fetched: rows.length,
      inserted_or_updated: storedCount,
      provider_status: "ok" as const,
      note: "GSC impressions = times this property appeared in Google results; not search volume.",
    };
  });
