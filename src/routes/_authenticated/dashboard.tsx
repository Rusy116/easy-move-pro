import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Customer Dashboard — Easy Moving" }] }),
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

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Dashboard</span>
            <h1 className="mt-2 font-serif text-4xl font-medium">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roles.includes("mover") && (
              <Link to="/company"><Button variant="secondary" className="rounded-full">Company portal</Button></Link>
            )}
            {roles.includes("admin") && (
              <Link to="/admin"><Button variant="secondary" className="rounded-full">Admin</Button></Link>
            )}
            <Link to="/calculator"><Button className="rounded-full">New quote</Button></Link>
            <Button variant="outline" className="rounded-full" onClick={signOut}>Sign out</Button>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-serif text-2xl font-medium">Your quotes</h2>
          {loading ? (
            <div className="mt-6 text-sm text-muted-foreground">Loading…</div>
          ) : quotes.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-muted-foreground">You don't have any quotes yet.</p>
              <Link to="/calculator" className="mt-4 inline-block">
                <Button className="rounded-full">Get your first quote</Button>
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
                  <div key={q.id} className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{q.quote_number ?? q.id.slice(0, 8)}</span>
                          <span>·</span>
                          <span>{new Date(q.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-1 font-serif text-xl font-medium">
                          {q.origin_city ?? q.origin_zip} → {q.destination_city ?? q.destination_zip}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground capitalize">
                          {q.property_type}
                          {q.move_date ? ` · Move ${q.move_date}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-2xl text-primary">
                          ${Number(q.estimated_low).toLocaleString()} – ${Number(q.estimated_high).toLocaleString()}
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          {q.accepted_at ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-600/30">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Accepted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="capitalize">{q.status}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {portalHref && (
                      <div className="mt-4 flex justify-end">
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                          <a href={portalHref}>
                            <FileText className="mr-2 h-4 w-4" />
                            {q.accepted_at ? "View estimate" : "View & accept"}
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
