import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs, InternalLinks, Cta } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, absoluteUrl } from "@/lib/seo/schema";
import { GEO_ROUTES } from "@/lib/seo/geo";
import { useT } from "@/i18n";

const TITLE = "Popular Moving Routes — Costs, Distance & Transit Times | Easy Moving";
const DESC =
  "Compare cost, distance and transit time for the most requested long-distance moving routes in the United States, then get an instant itemized quote.";

export const Route = createFileRoute("/routes/")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESC, path: "/routes" }),
    links: [{ rel: "canonical", href: absoluteUrl("/routes") }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Moving routes", url: "/routes" },
        ]),
      ),
    ],
  }),
  component: RoutesIndex,
});

function RoutesIndex() {
  const t = useT();
  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: t("pub.common.home"), to: "/" }, { label: t("pub.routesIndex.crumb") }]} />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
          {t("pub.routesIndex.eyebrow")}
        </span>
        <h1 className="mt-3 font-serif text-5xl font-medium">{t("pub.routesIndex.title")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("pub.routesIndex.subtitle")}
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GEO_ROUTES.map((r) => (
            <Link
              key={r.slug}
              to="/routes/$route"
              params={{ route: r.slug }}
              className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <h2 className="font-serif text-xl font-medium group-hover:text-primary transition-colors">
                {r.from.name} → {r.to.name}
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t("pub.routesIndex.distance")}</div>
                  <div className="font-medium">{r.miles.toLocaleString()} mi</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("pub.routesIndex.drive")}</div>
                  <div className="font-medium">{r.driveHours} hrs</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("pub.routesIndex.typical")}</div>
                  <div className="font-medium">${(r.low / 1000).toFixed(1)}k+</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <InternalLinks
        title={t("pub.common.exploreMore")}
        links={[
          { label: t("pub.common.moversByState"), to: "/states" },
          { label: t("pub.common.movingCalculator"), to: "/calculator" },
          { label: t("pub.common.resourcesCenter"), to: "/resources" },
          { label: t("pub.common.aiMovingTools"), to: "/ai-tools" },
        ]}
      />
      <Cta
        title={t("pub.routesIndex.ctaTitle")}
        subhead={t("pub.routesIndex.ctaSubhead")}
        primaryHref="/calculator"
        primaryLabel={t("pub.routesIndex.ctaLabel")}
      />
    </SiteLayout>
  );
}
