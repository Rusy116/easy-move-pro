import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuoteCalculator } from "@/components/calculator/QuoteCalculator";
import { useT } from "@/i18n";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Instant Moving Quote Calculator — Easy Moving" },
      {
        name: "description",
        content:
          "Get an instant, transparent moving cost estimate. Enter your ZIP codes and inventory — see a real price range in seconds.",
      },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const t = useT();
  return (
    <SiteLayout hideFooter>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
            {t("pub.calculator.badge")}
          </span>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-tight">
            {t("pub.calculator.title")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("pub.calculator.subtitle")}
          </p>
        </div>
        <QuoteCalculator />
      </section>
    </SiteLayout>
  );
}
