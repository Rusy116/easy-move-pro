import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Customer Dashboard — Easy Moving" }] }),
  component: DashboardPage,
});

interface Quote {
  id: string;
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
  created_at: string;
}

function DashboardPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      setEmail(user.user?.email ?? "");
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
          <div className="flex gap-2">
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
              {quotes.map((q) => (
                <div key={q.id} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString()}
                      </div>
                      <div className="mt-1 font-serif text-xl font-medium">
                        {q.origin_city ?? q.origin_zip} → {q.destination_city ?? q.destination_zip}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {q.bedrooms}BR {q.property_type}
                        {q.move_date ? ` · Move ${q.move_date}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-2xl text-primary">
                        ${Number(q.estimated_low).toLocaleString()} – ${Number(q.estimated_high).toLocaleString()}
                      </div>
                      <Badge variant="outline" className="mt-2 capitalize">{q.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
