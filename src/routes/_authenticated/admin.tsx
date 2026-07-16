import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Easy Moving" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) return;

      const [{ data: q }, { data: p }, { data: pr }] = await Promise.all([
        supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
        supabase.from("digital_products").select("*").order("created_at", { ascending: false }),
      ]);
      setQuotes(q ?? []);
      setPosts(p ?? []);
      setProducts(pr ?? []);
    })();
  }, []);

  if (isAdmin === null) {
    return <SiteLayout><div className="p-16 text-center text-muted-foreground">Loading…</div></SiteLayout>;
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-serif text-4xl">Admin access required</h1>
          <p className="mt-4 text-muted-foreground">
            Your account doesn't have the admin role. Contact the site owner to be granted access.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">← Back to dashboard</Link>
        </section>
      </SiteLayout>
    );
  }

  const revenue = quotes.reduce((s, q) => s + Number(q.estimated_low ?? 0), 0);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Admin</span>
        <h1 className="mt-2 font-serif text-4xl font-medium">Operations</h1>

        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          <Stat label="Quotes" value={quotes.length.toString()} />
          <Stat label="Pipeline value" value={`$${revenue.toLocaleString()}`} />
          <Stat label="Blog posts" value={posts.length.toString()} />
          <Stat label="Products" value={products.length.toString()} />
        </div>

        <div className="mt-12">
          <h2 className="font-serif text-2xl font-medium">Recent quotes</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Estimate</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-t border-border">
                    <td className="p-4 text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</td>
                    <td className="p-4">{q.origin_zip} → {q.destination_zip}</td>
                    <td className="p-4">{q.bedrooms}BR {q.property_type}</td>
                    <td className="p-4">${Number(q.estimated_low).toLocaleString()}–${Number(q.estimated_high).toLocaleString()}</td>
                    <td className="p-4"><Badge variant="outline" className="capitalize">{q.status}</Badge></td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No quotes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-medium">Blog</h2>
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
              {posts.map((p) => (
                <li key={p.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </div>
                  <Badge variant={p.published ? "default" : "outline"}>{p.published ? "Live" : "Draft"}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-medium">Store</h2>
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
              {products.map((p) => (
                <li key={p.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">${(p.price_cents / 100).toFixed(2)}</div>
                  </div>
                  <Badge variant={p.published ? "default" : "outline"}>{p.published ? "Live" : "Draft"}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-2 font-serif text-3xl font-medium">{value}</div>
    </div>
  );
}
