import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Easy Moving" },
      { name: "description", content: "We're rebuilding the moving industry around instant transparent pricing, vetted crews, and AI-powered move management." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">About</span>
        <h1 className="mt-3 font-serif text-5xl font-medium">A moving marketplace built for humans.</h1>
        <div className="mt-8 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            Moving is one of the most stressful things people do. Prices are opaque, quality is inconsistent, and the industry runs on paper and phone calls.
          </p>
          <p>
            Easy Moving is a new kind of marketplace. We match households with vetted, DOT-licensed movers in seconds, using AI to compute accurate itemized quotes and coordinate every step of the move.
          </p>
          <p>
            Every partner mover on our platform is background-checked, insured, and rated by real customers. Prices lock at booking. No surprise fees. Ever.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { k: "50,000+", v: "moves booked" },
            { k: "4.8/5", v: "average rating" },
            { k: "48 states", v: "coverage" },
          ].map((s) => (
            <div key={s.v} className="rounded-2xl border border-border bg-card p-6">
              <div className="font-serif text-4xl font-medium">{s.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <Link to="/contact"><Button className="rounded-full">Get in touch</Button></Link>
        </div>
      </section>
    </SiteLayout>
  );
}
