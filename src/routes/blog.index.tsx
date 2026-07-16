import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

const postsQueryOptions = queryOptions({
  queryKey: ["blog_posts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug,title,excerpt,published_at,cover_url")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Moving Guides & Tips — Easy Moving Blog" },
      { name: "description", content: "Expert moving guides, checklists, and cost breakdowns to make your relocation easier." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(postsQueryOptions);
  },
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts } = useSuspenseQuery(postsQueryOptions);
  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Guides</span>
        <h1 className="mt-3 font-serif text-5xl font-medium">Move smarter.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Field-tested advice from movers who've packed thousands of homes.
        </p>

        <div className="mt-12 divide-y divide-border">
          {posts.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="block py-8 group"
            >
              <div className="text-xs text-muted-foreground">
                {p.published_at ? new Date(p.published_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : ""}
              </div>
              <h2 className="mt-2 font-serif text-3xl font-medium group-hover:text-primary transition-colors">
                {p.title}
              </h2>
              <p className="mt-2 text-muted-foreground">{p.excerpt}</p>
              <div className="mt-3 text-sm font-medium text-primary">Read →</div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
