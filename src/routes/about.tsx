import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Easy Moving" },
      {
        name: "description",
        content:
          "We're rebuilding the moving industry around instant transparent pricing, vetted crews, and AI-powered move management.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const t = useT();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">{t("pub.about.eyebrow")}</span>
        <h1 className="mt-3 font-serif text-5xl font-medium">
          {t("pub.about.title")}
        </h1>
        <div className="mt-8 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>{t("pub.about.p1")}</p>
          <p>{t("pub.about.p2")}</p>
          <p>{t("pub.about.p3")}</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { k: "50,000+", v: t("pub.about.stat.moves") },
            { k: "4.8/5", v: t("pub.about.stat.rating") },
            { k: "48 states", v: t("pub.about.stat.coverage") },
          ].map((s) => (
            <div key={s.v} className="rounded-2xl border border-border bg-card p-6">
              <div className="font-serif text-4xl font-medium">{s.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <Link to="/contact">
            <Button className="rounded-full">{t("pub.about.cta")}</Button>
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
