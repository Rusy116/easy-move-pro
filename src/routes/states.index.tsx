import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs, InternalLinks, Cta } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, absoluteUrl } from "@/lib/seo/schema";
import { ACTIVE_STATES, citiesInStateSlug } from "@/lib/seo/geo";
import { useT } from "@/i18n";

const TITLE = "Movers by State — Moving Companies in All 50 States | Easy Moving";
const DESC =
  "Browse licensed moving companies by state and city. Instant moving cost estimates for local, long-distance and interstate moves across the United States.";

export const Route = createFileRoute("/states/")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESC, path: "/states" }),
    links: [{ rel: "canonical", href: absoluteUrl("/states") }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Movers by state", url: "/states" },
        ]),
      ),
    ],
  }),
  component: StatesIndex,
});

function StatesIndex() {
  const t = useT();
  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: t("pub.common.home"), to: "/" }, { label: t("pub.statesIndex.crumb") }]} />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
          {t("pub.statesIndex.eyebrow")}
        </span>
        <h1 className="mt-3 font-serif text-5xl font-medium">{t("pub.statesIndex.title")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("pub.statesIndex.subtitle")}
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVE_STATES.map((s) => {
            const cities = citiesInStateSlug(s.slug);
            return (
              <Link
                key={s.slug}
                to="/states/$state"
                params={{ state: s.slug }}
                className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-serif text-2xl font-medium group-hover:text-primary transition-colors">
                    {t("pub.statesIndex.stateMovers", { state: s.name })}
                  </h2>
                  <span className="text-xs text-muted-foreground">{s.code}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {cities.length} {cities.length === 1 ? t("pub.common.city") : t("pub.common.cities")} ·{" "}
                  {cities
                    .slice(0, 3)
                    .map((c) => c.name)
                    .join(", ")}
                  {cities.length > 3 ? "…" : ""}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <InternalLinks
        title={t("pub.common.exploreMore")}
        links={[
          { label: t("pub.common.popularRoutes"), to: "/routes" },
          { label: t("pub.common.movingCalculator"), to: "/calculator" },
          { label: t("pub.common.resourcesCenter"), to: "/resources" },
          { label: t("pub.common.forMovingCompanies"), to: "/for-movers" },
        ]}
      />
      <Cta
        title={t("pub.statesIndex.ctaTitle")}
        subhead={t("pub.statesIndex.ctaSubhead")}
        primaryHref="/calculator"
        primaryLabel={t("pub.common.startMyQuote")}
      />
    </SiteLayout>
  );
}
