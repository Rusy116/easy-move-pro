import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Lock } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, InternalLinks, Cta } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { AI_TOOLS } from "@/lib/seo/public-content";
import { isFeatureEnabled } from "@/lib/feature-flags";

const TITLE = "AI Moving Tools — Cost, Packing, Inventory & Timeline | Easy Moving";
const DESC =
  "Free AI moving tools: instant cost estimator, packing assistant, inventory generator, timeline planner and budget planner for your relocation.";

const FAQ = [
  {
    q: "Are the AI moving tools free?",
    a: "Yes. The AI cost estimator is live today and free to use. The remaining planners roll out to every Easy Moving account at no cost.",
  },
  {
    q: "Do I have to create an account?",
    a: "No account is needed to price a move. You only create one when you want to track the move in your customer portal.",
  },
  {
    q: "How accurate is the AI cost estimate?",
    a: "It prices your actual inventory volume, weight, access conditions, services and distance, so it is far closer than a bedroom-count guess. The final price is confirmed by the moving company that takes your job.",
  },
];

export const Route = createFileRoute("/ai-tools")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESC, path: "/ai-tools" }),
    links: [{ rel: "canonical", href: "/ai-tools" }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "AI moving tools", url: "/ai-tools" },
        ]),
      ),
      jsonLd(faqSchema(FAQ)),
    ],
  }),
  component: AiToolsPage,
});

function AiToolsPage() {
  // Future AI modules stay disabled behind the "ai-assistant" flag.
  const aiEnabled = isFeatureEnabled("ai-assistant");

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "AI tools" }]} />
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
            AI tools
          </span>
          <h1 className="mt-3 font-serif text-5xl font-medium">Plan the whole move with AI.</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            A connected toolkit that prices, packs, schedules and budgets your relocation. The cost
            estimator is live today; the rest are rolling out.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {AI_TOOLS.map((t) => {
              const live = Boolean(t.liveHref) || aiEnabled;
              return (
                <div
                  key={t.slug}
                  className="flex flex-col rounded-2xl border border-border bg-card p-6"
                >
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {live ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <h2 className="font-serif text-2xl font-medium">{t.name}</h2>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {t.tagline}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                  <div className="mt-6">
                    {t.liveHref ? (
                      <Link to={t.liveHref as "/calculator"}>
                        <Button className="rounded-full">Open tool</Button>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                        {aiEnabled ? "Beta — rolling out" : "Coming soon"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <InternalLinks
        title="Explore more"
        links={[
          { label: "Moving cost calculator", to: "/calculator" },
          { label: "Resources center", to: "/resources" },
          { label: "Digital products", to: "/products" },
          { label: "Movers by state", to: "/states" },
        ]}
      />
      <Cta
        title="Start with the AI cost estimator"
        subhead="Two minutes to a real itemized price range."
        primaryHref="/calculator"
        primaryLabel="Get my exact quote"
      />
    </SiteLayout>
  );
}
