import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";
import { INVENTORY_CATALOG } from "@/lib/inventory";
import type { EstimatePdfInput } from "@/lib/estimate-pdf";

interface ConfirmSearch {
  token?: string;
}

export const Route = createFileRoute("/quote/$quoteNumber")({
  validateSearch: (search: Record<string, unknown>): ConfirmSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Quote Confirmation — Easy Moving" },
      {
        name: "description",
        content:
          "Your moving request has been received. Review your quote number, estimated price range and move summary.",
      },
      { property: "og:title", content: "Quote Confirmation — Easy Moving" },
      {
        property: "og:description",
        content: "Your moving request has been received — review and download your estimate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: QuoteConfirmationPage,
});

type QuoteRow = {
  id: string;
  quote_number: string;
  portal_token: string;
  created_at: string;
  contact_email: string | null;
  contact_phone: string | null;
  origin_address: string | null;
  origin_city: string | null;
  origin_state: string | null;
  origin_zip: string | null;
  destination_address: string | null;
  destination_city: string | null;
  destination_state: string | null;
  destination_zip: string | null;
  move_date: string | null;
  distance_miles: number | null;
  num_movers: number | null;
  labor_hours: number | null;
  truck_size: string | null;
  estimated_cubic_feet: number | null;
  estimated_weight_lbs: number | null;
  estimated_low: number | null;
  estimated_high: number | null;
  insurance_tier: string | null;
  inventory: { id: string; quantity: number }[] | null;
  breakdown: { label: string; amount: number }[] | null;
  details: Record<string, unknown> | null;
};

const SELECT =
  "id, quote_number, portal_token, created_at, contact_email, contact_phone, origin_address, origin_city, origin_state, origin_zip, destination_address, destination_city, destination_state, destination_zip, move_date, distance_miles, num_movers, labor_hours, truck_size, estimated_cubic_feet, estimated_weight_lbs, estimated_low, estimated_high, insurance_tier, inventory, breakdown, details";

function money(n: number | null | undefined) {
  return typeof n === "number" ? `$${Math.round(n).toLocaleString("en-US")}` : "—";
}

function place(city: string | null, state: string | null, zip: string | null) {
  return [[city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ") || "—";
}

function toPdfInput(q: QuoteRow): EstimatePdfInput {
  const details = (q.details ?? {}) as Record<string, string>;
  return {
    quoteNumber: q.quote_number,
    createdAtISO: q.created_at,
    customer: {
      fullName: details.fullName || "—",
      email: q.contact_email ?? "—",
      phone: q.contact_phone ?? "—",
    },
    origin: {
      fullAddress: q.origin_address ?? "",
      city: q.origin_city ?? "",
      state: q.origin_state ?? "",
      zip: q.origin_zip ?? "",
    },
    destination: {
      fullAddress: q.destination_address ?? "",
      city: q.destination_city ?? "",
      state: q.destination_state ?? "",
      zip: q.destination_zip ?? "",
    },
    moveDate: q.move_date,
    distanceMiles: q.distance_miles ?? 0,
    numMovers: q.num_movers ?? 0,
    laborHours: q.labor_hours ?? 0,
    truckSize: q.truck_size ?? "",
    cubicFeet: q.estimated_cubic_feet ?? 0,
    weightLbs: q.estimated_weight_lbs ?? 0,
    estimatedLow: q.estimated_low ?? 0,
    estimatedHigh: q.estimated_high ?? 0,
    inventory: q.inventory ?? [],
    breakdown: q.breakdown ?? [],
    insurance: (q.insurance_tier ?? "basic") as EstimatePdfInput["insurance"],
    portalUrl:
      typeof window !== "undefined"
        ? `${window.location.origin}/portal/${q.quote_number}?token=${q.portal_token}`
        : `/portal/${q.quote_number}?token=${q.portal_token}`,
  };
}

function QuoteConfirmationPage() {
  const { quoteNumber } = Route.useParams();
  const { token } = useSearch({ from: "/quote/$quoteNumber" }) as ConfirmSearch;

  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError("Missing access token for this quote.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("quotes")
        .select(SELECT)
        .eq("quote_number", quoteNumber)
        .eq("portal_token", token)
        .maybeSingle();
      if (cancelled) return;
      if (error) setError("Could not load your quote. Please try again.");
      else if (!data) setError("Quote not found or the link is invalid.");
      else setQuote(data as unknown as QuoteRow);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [quoteNumber, token]);

  async function handleDownload() {
    if (!quote) return;
    const { downloadEstimatePdf } = await import("@/lib/estimate-pdf");
    downloadEstimatePdf(toPdfInput(quote));
  }

  if (loading) {
    return (
      <SiteLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SiteLayout>
    );
  }

  if (error || !quote) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-serif text-3xl font-medium">Quote unavailable</h1>
          <p className="mt-3 text-muted-foreground">{error ?? "Something went wrong."}</p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/calculator">Back to the calculator</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const items = (quote.inventory ?? []).filter((i) => i.quantity > 0);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-5 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
            Your moving request has been received.
          </h1>
          <p className="mt-4 text-muted-foreground">
            A moving specialist will contact you shortly. Keep your quote number for reference.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Quote number
            </div>
            <div className="mt-1 font-mono text-lg font-semibold">{quote.quote_number}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Estimated price range
            </div>
            <div className="mt-1 text-lg font-semibold">
              {money(quote.estimated_low)} – {money(quote.estimated_high)}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Moving summary
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["From", place(quote.origin_city, quote.origin_state, quote.origin_zip)],
              [
                "To",
                place(quote.destination_city, quote.destination_state, quote.destination_zip),
              ],
              [
                "Move date",
                quote.move_date ? new Date(quote.move_date).toLocaleDateString() : "Flexible",
              ],
              [
                "Distance",
                quote.distance_miles ? `${Math.round(quote.distance_miles)} miles` : "—",
              ],
              ["Crew", quote.num_movers ? `${quote.num_movers} movers` : "—"],
              ["Truck", quote.truck_size || "—"],
              [
                "Volume",
                quote.estimated_cubic_feet ? `${quote.estimated_cubic_feet} cu ft` : "—",
              ],
              ["Weight", quote.estimated_weight_lbs ? `${quote.estimated_weight_lbs} lbs` : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {items.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Inventory
              </div>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {INVENTORY_CATALOG.find((c) => c.id === i.id)?.label ?? i.id}
                    </span>
                    <span className="font-medium">×{i.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" className="rounded-full" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <a href={`/portal/${quote.quote_number}?token=${quote.portal_token}`}>
              <FileText className="mr-2 h-4 w-4" />
              View estimate
            </a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-full">
            <Link to="/calculator">
              <Pencil className="mr-2 h-4 w-4" />
              Edit request
            </Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
