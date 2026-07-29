import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

const postQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["blog_post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(postQueryOptions(params.slug)),
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.title} — Easy Moving Blog` },
            { name: "description", content: loaderData.excerpt ?? "" },
            { property: "og:title", content: loaderData.title },
            { property: "og:description", content: loaderData.excerpt ?? "" },
          ],
        }
      : { meta: [{ title: "Post" }] },
  component: PostPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">Post not found</h1>
        <Link to="/blog" className="mt-6 inline-block text-primary hover:underline">
          Back to blog →
        </Link>
      </div>
    </SiteLayout>
  ),
});

function PostPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postQueryOptions(slug));
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">
          ← All guides
        </Link>
        <h1 className="mt-4 font-serif text-5xl font-medium leading-tight">{post.title}</h1>
        {post.published_at && (
          <div className="mt-3 text-sm text-muted-foreground">
            {new Date(post.published_at).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}
        <div className="prose prose-neutral mt-10 max-w-none text-lg leading-relaxed text-foreground whitespace-pre-wrap">
          {post.body}
        </div>
      </article>
    </SiteLayout>
  );
}
