import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  FileText,
  Plus,
  LogOut,
  Truck,
  ArrowRight,
  Calendar,
  MapPin,
  DollarSign,
  ClipboardList,
  Shield,
} from "lucide-react";
import { PageHeader, StatCard, SkeletonRows } from "@/components/shell/Chrome";

export const Route = createFileRoute("/_authenticated/customer/quotes")({
  head: () => ({ meta: [{ title: "My Quotes — Easy Moving" }] }),
  component: DashboardPage,
});

interface Quote {
  id: string;
  quote_number: string | null;
  portal_token: string | null;
  origin_zip: string;
  destination_zip: string;
  origin_city: string | null;
  destination_city: string | null;
  property_type: string;
  bedrooms: number;
  move_date: string | null;
  estimated_low: number;
  estimated_high: number;
  status: string;
  accepted_at: string | null;
  created_at: string;
}

function DashboardPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      setEmail(user.user?.email ?? "");
      if (user.user) {
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.user.id);
        setRoles((r ?? []).map((x) => x.role as string));
      }
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      setQuotes((data ?? []) as Quote[]);
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const stats = useMemo(() => {
    const accepted = quotes.filter((q) => q.accepted_at).length;
    const active = quotes.filter(
      (q) => !q.accepted_at && !["lost", "cancelled"].includes(q.status),
    ).length;
    const avg =
      quotes.length === 0
        ? 0
        : Math.round(
            quotes.reduce(
              (sum, q) => sum + (Number(q.estimated_low) + Number(q.estimated_high)) / 2,
              0,
            ) / quotes.length,
          );
    return { total: quotes.length, accepted, active, avg };
  }, [quotes]);

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-16">
          <PageHeader
            eyebrow="Customer dashboard"
            title="Welcome back"
            subtitle={<span className="truncate">{email}</span>}
            icon={<Shield className="h-5 w-5" />}
            actions={
              <>
                {roles.includes("mover") && (
                  <Link to="/company">
                    <Button variant="secondary" className="rounded-full">
                      <Truck className="mr-1.5 h-4 w-4" /> Company portal
                    </Button>
                  </Link>
                )}
                {roles.includes("admin") && (
                  <Link to="/admin">
                    <Button variant="secondary" className="rounded-full">
                      Admin
                    </Button>
                  </Link>
                )}
                <Link to="/calculator">
                  <Button className="rounded-full shadow-sm">
                    <Plus className="mr-1.5 h-4 w-4" /> New quote
                  </Button>
                </Link>
              </>
            }
          />

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Quotes"
              value={stats.total}
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <StatCard
              label="Active"
              value={stats.active}
              tone="info"
              icon={<Calendar className="h-4 w-4" />}
            />
            <StatCard
              label="Accepted"
              value={stats.accepted}
              tone="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <StatCard
              label="Avg estimate"
              value={stats.avg ? `$${stats.avg.toLocaleString()}` : "—"}
              icon={<DollarSign className="h-4 w-4" />}
            />
          </div>

          {/* Quotes list */}
          <div className="mt-10">
            <div className="flex items-end justify-between">
              <h2 className="font-serif text-2xl font-medium">Your quotes</h2>
              {quotes.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="mt-6">
                <SkeletonRows n={3} />
              </div>
            ) : quotes.length === 0 ? (
              <div className="mt-6 card-premium p-10 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sage-soft text-sage">
                  <Truck className="h-6 w-6" />
                </div>
                <p className="mt-4 font-serif text-lg">No quotes yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get an instant estimate in under a minute.
                </p>
                <Link to="/calculator" className="mt-4 inline-block">
                  <Button className="rounded-full">
                    Get your first quote <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {quotes.map((q) => {
                  const portalHref =
                    q.quote_number && q.portal_token
                      ? `/portal/${q.quote_number}?token=${q.portal_token}`
                      : null;
                  return (
                    <article
                      key={q.id}
                      className="card-premium card-premium-hover p-5 sm:p-6 animate-fade-in-soft"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono font-medium text-foreground/80">
                              {q.quote_number ?? q.id.slice(0, 8)}
                            </span>
                            <span aria-hidden>·</span>
                            <span>{new Date(q.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 font-serif text-xl font-medium">
                            <MapPin className="h-4 w-4 shrink-0 text-sage" />
                            <span className="truncate">
                              {q.origin_city ?? q.origin_zip}
                              <ArrowRight className="mx-2 inline h-4 w-4 text-muted-foreground" />
                              {q.destination_city ?? q.destination_zip}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground capitalize">
                            <span>{q.property_type}</span>
                            {q.move_date && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> {q.move_date}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-serif text-2xl font-medium tabular-nums text-gradient-brand">
                            ${Number(q.estimated_low).toLocaleString()} – $
                            {Number(q.estimated_high).toLocaleString()}
                          </div>
                          <div className="mt-2 flex items-center justify-end gap-2">
                            {q.accepted_at ? (
                              <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-600/30">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Accepted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="capitalize">
                                {q.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {portalHref && (
                        <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
                          <Button asChild variant="ghost" size="sm" className="rounded-full">
                            <a href={portalHref}>
                              <FileText className="mr-2 h-4 w-4" />
                              {q.accepted_at ? "View estimate" : "View & accept"}
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
