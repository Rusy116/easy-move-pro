import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  SeoHero,
  FeatureGrid,
  Faq,
  Cta,
  Breadcrumbs,
  InternalLinks,
  Statistics,
} from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/seo/schema";
import { findLocation, citiesInState, CITIES } from "@/lib/seo/locations";

export const Route = createFileRoute("/partners/$location")({
  loader: ({ params }) => {
    const loc = findLocation(params.location);
    if (!loc) throw notFound();
    return { location: loc };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Location not found" }, { name: "robots", content: "noindex" }] };
    }
    const loc = loaderData.location;
    const isState = loc.kind === "state";
    const where = isState ? loc.name : `${loc.name}, ${loc.state}`;
    const title = isState
      ? `Moving Company Partners in ${loc.name} | Easy Moving`
      : `Moving Leads in ${where} — Partner With Easy Moving`;
    const description = isState
      ? `Grow your moving business in ${loc.name}. Get exclusive ${loc.name} moving leads, a full CRM, dispatch, and invoicing from Easy Moving.`
      : `Get exclusive ${where} moving leads from real customers. Easy Moving delivers verified leads to vetted movers in ${where}.`;

    const path = `/partners/${params.location}`;
    return {
      meta: seoMeta({ title, description, path }),
      links: [{ rel: "canonical", href: path }],
      scripts: [
        jsonLd(
          serviceSchema({
            name: `Moving Leads in ${where}`,
            description,
            areaServed: where,
          }),
        ),
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Partners", url: "/partners" },
            { name: loc.name, url: path },
          ]),
        ),
        jsonLd(faqSchema(buildFaq(loc.name, isState))),
      ],
    };
  },
  component: LocationPage,
  notFoundComponent: NotFoundLoc,
});

function buildFaq(name: string, isState: boolean) {
  return [
    {
      q: `How do I get moving leads in ${name}?`,
      a: `Apply to become an Easy Moving partner. Once approved, you'll get access to exclusive and marketplace ${name} moving leads with verified customer details.`,
    },
    {
      q: `How much do ${name} moving leads cost?`,
      a: `Pricing depends on move type and demand. Local ${isState ? "moves in " + name : name + " moves"} start around $40 for exclusive leads. Marketplace leads are lower.`,
    },
    {
      q: `What areas do you cover in ${name}?`,
      a: `We cover every metro in ${name}. Set your specific service ZIPs, cities, and radius during onboarding.`,
    },
    {
      q: "How fast can I start receiving leads?",
      a: "1–3 business days after verification of DOT/MC and insurance.",
    },
  ];
}

function NotFoundLoc() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold">Location not found</h1>
        <p className="mt-3 text-muted-foreground">Try one of our partner pages.</p>
        <Link to="/partners" className="mt-6 inline-block text-primary underline">
          Back to partners
        </Link>
      </div>
    </SiteLayout>
  );
}

function LocationPage() {
  const { location } = Route.useLoaderData();
  const isState = location.kind === "state";
  const where = isState ? location.name : `${location.name}, ${location.state}`;
  const cities = isState && location.state ? citiesInState(location.state) : [];

  const faq = buildFaq(location.name, isState);

  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Partners", to: "/partners" },
          { label: location.name },
        ]}
      />
      <SeoHero
        eyebrow={isState ? "State Partner Program" : "City Partner Program"}
        title={isState ? `Moving company partners in ${location.name}` : `Moving leads in ${where}`}
        subhead={
          isState
            ? `Join Easy Moving to grow your moving business in ${location.name}. Get exclusive leads, a purpose-built CRM, and dispatch tools designed for movers.`
            : `Get exclusive ${where} moving leads from real customers using our AI quote calculator. Verified move details, no shared lists, no monthly minimum.`
        }
      />

      <Statistics
        items={[
          { value: isState ? "24/7" : "Live", label: `${where} lead coverage` },
          { value: "12 hrs", label: "Exclusive claim window" },
          { value: "$0", label: "Monthly minimum" },
          { value: "1–3 days", label: "Time to approval" },
        ]}
      />

      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 prose prose-neutral dark:prose-invert">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">
            {isState
              ? `Why moving companies in ${location.name} partner with Easy Moving`
              : `The best way to get moving leads in ${where}`}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {isState
              ? `${location.name} is one of the most competitive moving markets in the U.S. Easy Moving takes the guesswork out of growth by delivering exclusive, pre-qualified leads directly to your inbox. Whether you run a two-truck operation in a small metro or a fleet of ten across the state, you'll get customers who've already used our instant quote calculator — so pricing conversations are quick and closes are higher.`
              : `Winning moving jobs in ${where} shouldn't require you to become a marketing expert. Easy Moving runs SEO, paid ads, and a free customer calculator that produces high-intent leads in ${where} every single day. We assign them to one partner at a time, with full move details attached — origin, destination, inventory, and preferred date.`}
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Every ${location.name} partner also gets our built-in CRM, estimate builder, dispatch
            board, and invoicing — replacing 5+ tools you'd otherwise stitch together. Pay only for
            the leads you claim; no monthly minimum, no long-term contracts.
          </p>
        </div>
      </section>

      <FeatureGrid
        title="What you get as an Easy Moving partner"
        items={[
          {
            title: `${where} exclusive leads`,
            body: "12-hour claim window before a lead opens to the marketplace.",
          },
          {
            title: "Verified customer info",
            body: "Every phone and email is validated before it reaches you.",
          },
          {
            title: "Full move details",
            body: "Cubic feet, inventory, distance, dates — never just a name.",
          },
          {
            title: "Built-in CRM & dispatch",
            body: "Manage the full lifecycle from lead to invoice on one platform.",
          },
          {
            title: "No monthly minimum",
            body: "Pay per lead. Pause any time. Scale up or down freely.",
          },
          {
            title: "Refund on bad leads",
            body: "Duplicate or bogus number? We credit your account within 48 hours.",
          },
        ]}
      />

      {cities.length > 0 && (
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight">
              Cities we cover in {location.name}
            </h2>
            <div className="mt-6 grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {cities.map((c) => (
                <Link
                  key={c.slug}
                  to="/partners/$location"
                  params={{ location: c.slug }}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {!isState && (
        <InternalLinks
          title="Nearby markets"
          links={CITIES.filter((c) => c.state === location.state && c.slug !== location.slug)
            .slice(0, 10)
            .map((c) => ({ label: `${c.name}, ${c.state}`, to: `/partners/${c.slug}` }))}
        />
      )}

      <Faq items={faq} />

      <Cta
        title={`Ready to grow in ${where}?`}
        subhead={`Apply now — approval takes 1–3 business days.`}
      />
    </SiteLayout>
  );
}
