import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  SeoHero, FeatureGrid, Benefits, Statistics, Faq, Testimonials, PartnerLogos, Cta,
  Breadcrumbs, InternalLinks,
} from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, organizationSchema } from "@/lib/seo/schema";
import { STATES, CITIES } from "@/lib/seo/locations";
import { PRODUCT_PAGES, EDUCATION_PAGES } from "@/lib/seo/content";

const FAQ = [
  { q: "How do I become an Easy Moving partner?", a: "Fill out the partner application. We verify your DOT/MC and insurance and approve within 1–3 business days." },
  { q: "How much do leads cost?", a: "Exclusive local leads start around $40. Marketplace leads are lower. There is no monthly minimum." },
  { q: "Do I need to sign a contract?", a: "No — Easy Moving is pay-per-lead with no long-term commitment." },
  { q: "How are leads generated?", a: "Organic SEO, our AI-powered instant quote calculator, and paid channels we run ourselves." },
  { q: "Can I choose the areas I serve?", a: "Yes — set state, city, and radius coverage during onboarding." },
];

export const Route = createFileRoute("/partners/")({
  head: () => ({
    meta: seoMeta({
      title: "Become an Easy Moving Partner — Grow Your Moving Business",
      description: "Join the Easy Moving partner network. Get exclusive moving leads, a full CRM, dispatch, estimator, and invoicing — with no monthly minimums.",
      path: "/partners",
    }),
    links: [{ rel: "canonical", href: "/partners" }],
    scripts: [
      jsonLd(organizationSchema()),
      jsonLd(faqSchema(FAQ)),
      jsonLd(breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Partners", url: "/partners" },
      ])),
    ],
  }),
  component: PartnersIndex,
});

function PartnersIndex() {
  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Partners" }]} />
      <SeoHero
        eyebrow="For Moving Companies"
        title="Grow your moving business with Easy Moving"
        subhead="Exclusive leads, a full CRM, dispatch, estimating, and invoicing — under one roof. Pay per lead, no monthly minimum, no contracts."
        primaryHref="/join"
        primaryLabel="Apply to become a partner"
        secondaryHref="/moving-leads"
        secondaryLabel="See how leads work"
      />

      <Statistics
        items={[
          { value: "50 states", label: "Nationwide coverage" },
          { value: "12 hrs", label: "Exclusive lead SLA" },
          { value: "$0", label: "Monthly minimum" },
          { value: "1–3 days", label: "Time to approval" },
        ]}
      />

      <PartnerLogos />

      <FeatureGrid
        title="Everything you need to run a modern moving company"
        items={[
          { title: "Exclusive leads", body: "12-hour claim window before a lead opens to the marketplace. No shared lists." },
          { title: "Open marketplace", body: "Unclaimed leads flow into a first-come marketplace. Capped at 4 partners per lead." },
          { title: "Built-in CRM", body: "Track every lead from first call to final payment on one timeline." },
          { title: "Estimate builder", body: "Itemized labor, truck, packing, and supplies. Branded PDFs in under two minutes." },
          { title: "Dispatch board", body: "Day, week, and month views. Assign trucks and crews, prevent double-bookings." },
          { title: "Invoicing", body: "Deposits, final balances, and extras. Generate PDFs and email in one click." },
        ]}
      />

      <Benefits
        title="Why moving companies pick Easy Moving"
        items={[
          { title: "Real customers, not tire kickers", body: "Every lead comes with a verified phone, verified email, and full move details — origin, destination, inventory, and dates." },
          { title: "You keep 100% of the revenue", body: "Unlike traditional moving brokers, we don't take a cut of your jobs. You set the price, you keep the customer." },
          { title: "Purpose-built for movers", body: "The CRM, estimator, and dispatch are designed by people who've worked in the moving industry — not repurposed from generic tools." },
          { title: "Grow at your own pace", body: "Set your daily lead cap, choose the markets you serve, and pause any time. No contracts, no monthly minimums." },
        ]}
      />

      <Testimonials />

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">Partner coverage across the U.S.</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">We serve moving companies in every state. Click your state to see local pricing and coverage.</p>
          <div className="mt-8 grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {STATES.map((s) => (
              <Link
                key={s.slug}
                to="/partners/$location"
                params={{ location: s.slug }}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {s.name}
              </Link>
            ))}
          </div>

          <h3 className="mt-14 text-lg font-semibold text-foreground">Top cities</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {CITIES.slice(0, 30).map((c) => (
              <Link
                key={c.slug}
                to="/partners/$location"
                params={{ location: c.slug }}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {c.name}, {c.state}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Faq items={FAQ} />

      <InternalLinks
        title="Explore Easy Moving for movers"
        links={[
          ...PRODUCT_PAGES.map((p) => ({ label: p.h1, to: p.route })),
          ...EDUCATION_PAGES.slice(0, 5).map((p) => ({ label: p.title, to: `/learn/${p.slug}` })),
        ]}
      />

      <Cta />
    </SiteLayout>
  );
}
