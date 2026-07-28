import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  Download,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import type { EstimatePdfInput } from "@/lib/estimate-pdf";
import { INVENTORY_CATALOG } from "@/lib/inventory";

interface PortalSearch {
  token?: string;
}

export const Route = createFileRoute("/portal/$quoteNumber")({
  validateSearch: (search: Record<string, unknown>): PortalSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your Moving Quote — Easy Moving" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalPage,
});

type QuoteRow = {
  id: string;
  quote_number: string;
  portal_token: string;
  status: string;
  accepted_at: string | null;
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
  job_status: string | null;
  final_price: number | null;
  final_move_date: string | null;
  arrival_window: string | null;
  crew_size: number | null;
  final_truck_size: string | null;
  company_notes: string | null;
  final_quote_sent_at: string | null;
  customer_response_at: string | null;
};


function money(n: number | null | undefined) {
  return typeof n === "number" ? `$${Math.round(n).toLocaleString("en-US")}` : "—";
}

function PortalPage() {
  const { quoteNumber } = Route.useParams();
  const search = useSearch({ from: "/portal/$quoteNumber" }) as PortalSearch;
  const token = search.token;

  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [responding, setResponding] = useState(false);


  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError("Missing access token. Please use the link from your email.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("quotes")
        .select(
          "id, quote_number, portal_token, status, accepted_at, created_at, contact_email, contact_phone, origin_address, origin_city, origin_state, origin_zip, destination_address, destination_city, destination_state, destination_zip, move_date, distance_miles, num_movers, labor_hours, truck_size, estimated_cubic_feet, estimated_weight_lbs, estimated_low, estimated_high, insurance_tier, inventory, breakdown, details, job_status, final_price, final_move_date, arrival_window, crew_size, final_truck_size, company_notes, final_quote_sent_at, customer_response_at",
        )
        .eq("quote_number", quoteNumber)
        .eq("portal_token", token)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError("Could not load your quote. Please check your link.");
      } else if (!data) {
        setError("Quote not found or the link is invalid.");
      } else {
        setQuote(data as unknown as QuoteRow);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [quoteNumber, token]);

  // Live updates: the assigned moving company can send a final quote at any time.
  useEffect(() => {
    if (!quote?.id) return;
    const channel = supabase
      .channel(`portal-quote-${quote.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quotes", filter: `id=eq.${quote.id}` },
        (payload) => {
          const row = payload.new as Partial<QuoteRow>;
          setQuote((prev) => (prev ? { ...prev, ...row } : prev));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [quote?.id]);

  async function handleFinalResponse(accept: boolean) {
    if (!quote || !token) return;
    setResponding(true);
    const { error } = await supabase.rpc("fn_customer_respond_final_quote", {
      _quote_number: quote.quote_number,
      _token: token,
      _accept: accept,
    });
    setResponding(false);
    if (error) {
      toast.error(error.message || "Could not submit your response.");
      return;
    }
    setQuote({
      ...quote,
      job_status: accept ? "accepted" : "rejected",
      customer_response_at: new Date().toISOString(),
      accepted_at: accept ? new Date().toISOString() : quote.accepted_at,
    });
    toast.success(accept ? "Final quote accepted." : "Final quote rejected.");
  }


  async function handleAccept() {
    if (!quote || !token) return;
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_quote", {
      _quote_number: quote.quote_number,
      _portal_token: token,
    });
    setAccepting(false);
    if (error) {
      toast.error("Could not accept the estimate. Please try again.");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setQuote({
        ...quote,
        accepted_at: row.accepted_at ?? new Date().toISOString(),
        status: row.status ?? "accepted",
      });
      toast.success("Estimate accepted. A specialist will confirm your booking shortly.");
    }
  }

  async function handleDownload() {
    if (!quote) return;
    const pdfInput: EstimatePdfInput = {
      quoteNumber: quote.quote_number,
      createdAtISO: quote.created_at,
      customer: {
        fullName:
          (quote.details && (quote.details as Record<string, string>).fullName) || "—",
        email: quote.contact_email ?? "—",
        phone: quote.contact_phone ?? "—",
      },
      origin: {
        fullAddress: quote.origin_address ?? "",
        city: quote.origin_city ?? "",
        state: quote.origin_state ?? "",
        zip: quote.origin_zip ?? "",
      },
      destination: {
        fullAddress: quote.destination_address ?? "",
        city: quote.destination_city ?? "",
        state: quote.destination_state ?? "",
        zip: quote.destination_zip ?? "",
      },
      moveDate: quote.move_date,
      distanceMiles: quote.distance_miles ?? 0,
      numMovers: quote.num_movers ?? 0,
      laborHours: quote.labor_hours ?? 0,
      truckSize: quote.truck_size ?? "",
      cubicFeet: quote.estimated_cubic_feet ?? 0,
      weightLbs: quote.estimated_weight_lbs ?? 0,
      estimatedLow: quote.estimated_low ?? 0,
      estimatedHigh: quote.estimated_high ?? 0,
      inventory: quote.inventory ?? [],
      breakdown: quote.breakdown ?? [],
      insurance: quote.insurance_tier ?? "basic",
      portalUrl:
        typeof window !== "undefined"
          ? `${window.location.origin}/portal/${quote.quote_number}?token=${quote.portal_token}`
          : undefined,
    };
    const { downloadEstimatePdf } = await import("@/lib/estimate-pdf");
    downloadEstimatePdf(pdfInput);
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
            <a href="/">Return home</a>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const accepted = Boolean(quote.accepted_at);
  const inventoryItems =
    quote.inventory
      ?.map((it) => {
        const meta = INVENTORY_CATALOG.find((m) => m.id === it.id);
        return meta ? { label: meta.label, qty: it.quantity } : null;
      })
      .filter(Boolean) ?? [];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sage">
              Moving Estimate
            </div>
            <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
              {quote.quote_number}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Created {new Date(quote.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={quote.status} accepted={accepted} />
            <Button onClick={handleDownload} variant="outline" className="rounded-full">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>

        {/* Estimate card */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6 sm:p-8">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Estimated Total
          </div>
          <div className="mt-2 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
            {money(quote.estimated_low)} – {money(quote.estimated_high)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4" /> {quote.truck_size ?? "—"}
            </span>
            <span>{quote.num_movers ?? 0} movers · {quote.labor_hours?.toFixed(1) ?? "—"} hrs</span>
            <span>{quote.estimated_cubic_feet ?? 0} cu ft · {quote.estimated_weight_lbs?.toLocaleString() ?? 0} lbs</span>
            <span>{quote.distance_miles ?? 0} mi</span>
          </div>

          {!accepted ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={handleAccept}
                disabled={accepting}
                size="lg"
                className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {accepting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Accept Estimate
              </Button>
              <p className="text-xs text-muted-foreground">
                Accepting lets your moving specialist finalize scheduling. Non-binding — final
                price confirmed after inspection.
              </p>
            </div>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Accepted on{" "}
              {new Date(quote.accepted_at!).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
        </div>

        {/* Route + move */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <InfoCard
            title="Origin"
            icon={<MapPin className="h-4 w-4" />}
            lines={[
              quote.origin_address || `${quote.origin_city}, ${quote.origin_state} ${quote.origin_zip}`,
            ]}
          />
          <InfoCard
            title="Destination"
            icon={<MapPin className="h-4 w-4" />}
            lines={[
              quote.destination_address || `${quote.destination_city}, ${quote.destination_state} ${quote.destination_zip}`,
            ]}
          />
          <InfoCard
            title="Move date"
            icon={<Calendar className="h-4 w-4" />}
            lines={[quote.move_date || "Flexible"]}
          />
          <InfoCard
            title="Contact"
            icon={<Phone className="h-4 w-4" />}
            lines={[quote.contact_phone ?? "—", quote.contact_email ?? "—"]}
          />
        </div>

        {/* Breakdown */}
        {quote.breakdown && quote.breakdown.length > 0 && (
          <section className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-serif text-xl font-medium">Cost breakdown</h2>
            <div className="mt-4 divide-y divide-border">
              {quote.breakdown.map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">{money(row.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Inventory */}
        {inventoryItems.length > 0 && (
          <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-serif text-xl font-medium">Inventory</h2>
            <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {inventoryItems.map((it) => (
                <div
                  key={it!.label}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{it!.label}</span>
                  <span className="font-medium">×{it!.qty}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trust */}
        <div className="mt-8 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {[
            { Icon: BadgeCheck, label: "Licensed & insured" },
            { Icon: ShieldCheck, label: "Non-binding estimate" },
            { Icon: Truck, label: "Vetted movers" },
            { Icon: Mail, label: "Support 7 days" },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2 py-2"
            >
              <Icon className="h-3.5 w-3.5 text-sage" />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}

function InfoCard({
  title,
  icon,
  lines,
}: {
  title: string;
  icon: React.ReactNode;
  lines: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="mt-2 space-y-0.5 text-sm">
        {lines.map((l, i) => (
          <div key={i} className="text-foreground">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status, accepted }: { status: string; accepted: boolean }) {
  const label = accepted ? "Accepted" : status.charAt(0).toUpperCase() + status.slice(1);
  const cls = accepted
    ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-700"
    : "border-border bg-background text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
