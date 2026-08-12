import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  SeoHero,
  Benefits,
  FeatureGrid,
  Statistics,
  Testimonials,
  PartnerLogos,
  Faq,
  InternalLinks,
  Cta,
  Breadcrumbs,
} from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, serviceSchema, absoluteUrl } from "@/lib/seo/schema";

const TITLE = "Join Easy Moving — Exclusive Moving Leads & Free Mover CRM";
const DESC =
  "Grow your moving company with exclusive leads, a 12-hour response window, a free CRM, estimates, scheduling and invoicing. Pay only when you win the job.";

const FAQ = [
  {
    q: "What does it cost to join?",
    a: "Nothing upfront and no monthly minimum. Easy Moving earns a commission on jobs you win and confirm, invoiced after the final price is set.",
  },
  {
    q: "How is the commission calculated?",
    a: "A flat 25% of the confirmed final move price, invoiced automatically the moment you confirm the price in your portal. If the customer cancels before completion, the commission is cancelled too.",
  },
  {
    q: "Are leads exclusive?",
    a: "Yes. Every qualified lead is offered to one company first with a 12-hour exclusive response window. If it is not actioned, it moves to the open marketplace.",
  },
  {
    q: "How do you protect customer privacy?",
    a: "Customer contact details stay masked in the marketplace until you claim the job. Once you claim it, you get full contact and property details.",
  },
  {
    q: "What is included in the CRM?",
    a: "Lead pipeline, estimate builder, job scheduling, customer records, messaging, documents, invoicing, commissions and performance analytics — included at no extra cost.",
  },
  {
    q: "How long does approval take?",
    a: "Most applications are reviewed within 1–3 business days. We verify licensing, DOT/MC authority where applicable, insurance and service area.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "1. Apply and get verified",
    body: "Submit your license, DOT/MC and insurance. We verify and approve in 1–3 business days.",
  },
  {
    title: "2. Receive exclusive leads",
    body: "Qualified customers matched to your service area land in your portal with a 12-hour exclusive window.",
  },
  {
    title: "3. Claim the job",
    body: "Claim to unlock full customer details. First company to claim wins — no bidding wars, no shared lists.",
  },
  {
    title: "4. Confirm the final price",
    body: "Build the estimate, set the final price and move date. The customer confirms in their portal.",
  },
  {
    title: "5. Complete the move",
    body: "The customer pays you directly. Easy Moving never touches your moving revenue.",
  },
  {
    title: "6. Settle commission",
    body: "A single commission invoice is issued automatically per completed job. Nothing else to reconcile.",
  },
];

const CRM_FEATURES = [
  {
    title: "Lead pipeline",
    body: "Every lead, claim and status change in one board with full audit history.",
  },
  {
    title: "Estimate builder",
    body: "Inventory-driven estimates with cubic feet, weight, crew size and truck size calculated for you.",
  },
  {
    title: "Scheduling",
    body: "Calendar view of confirmed jobs, move windows and crew assignments.",
  },
  {
    title: "Customer CRM",
    body: "Contact records, internal notes, message history and documents per job.",
  },
  {
    title: "Invoicing & commissions",
    body: "Automatic commission invoices, outstanding balances and paid history.",
  },
  {
    title: "Performance analytics",
    body: "Claim rate, win rate, average job value and revenue trend by month.",
  },
];

export const Route = createFileRoute("/for-movers")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESC, path: "/for-movers" }),
    links: [{ rel: "canonical", href: absoluteUrl("/for-movers") }],
    scripts: [
      jsonLd(
        serviceSchema({
          name: "Easy Moving Partner Program",
          description: DESC,
          areaServed: "United States",
        }),
      ),
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "For moving companies", url: "/for-movers" },
        ]),
      ),
      jsonLd(faqSchema(FAQ)),
    ],
  }),
  component: ForMoversPage,
});

function ForMoversPage() {
  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "For moving companies" }]} />
      <SeoHero
        eyebrow="For Moving Companies"
        title="Join Easy Moving"
        subhead="Exclusive, verified moving leads and a complete operations CRM — with no monthly fee. You only pay a commission on jobs you actually win."
        primaryHref="/partners/apply"
        primaryLabel="Apply now"
        secondaryHref="/moving-leads"
        secondaryLabel="See how leads work"
      />

      <Statistics
        items={[
          { value: "12 hrs", label: "Exclusive response window" },
          { value: "25%", label: "Commission on won jobs" },
          { value: "$0", label: "Monthly platform fee" },
          { value: "1–3 days", label: "Approval time" },
        ]}
      />

      <PartnerLogos />

      <Benefits
        title="Why moving companies switch to Easy Moving"
        items={[
          {
            title: "Exclusive, not shared",
            body: "One company gets the lead first. No racing five competitors to the same phone number.",
          },
          {
            title: "Pay for outcomes",
            body: "No lead fees, no subscriptions. Commission is only owed on a confirmed, completed job.",
          },
          {
            title: "Qualified before delivery",
            body: "Every lead is reviewed by a broker before it reaches you — inventory, dates and budget included.",
          },
          {
            title: "Full CRM included",
            body: "Estimates, scheduling, messaging, documents, invoicing and analytics at no extra cost.",
          },
          {
            title: "You keep the customer relationship",
            body: "The customer pays you directly. We never process your moving revenue.",
          },
          {
            title: "Transparent commission",
            body: "One automatic invoice per job, cancelled automatically if the customer cancels.",
          },
        ]}
      />

      <FeatureGrid title="How the marketplace works" items={HOW_IT_WORKS} />
      <FeatureGrid title="What's included in the mover CRM" items={CRM_FEATURES} />
      <Testimonials />
      <Faq items={FAQ} />

      <InternalLinks
        title="More for movers"
        links={[
          { label: "Moving leads", to: "/moving-leads" },
          { label: "Exclusive moving leads", to: "/exclusive-moving-leads" },
          { label: "Moving company CRM", to: "/moving-company-crm" },
          { label: "Moving company software", to: "/moving-company-software" },
          { label: "Open marketplace", to: "/open-marketplace" },
          { label: "Partner locations", to: "/partners" },
        ]}
      />

      <Cta
        title="Apply to become an Easy Moving partner"
        subhead="Approval takes 1–3 business days. No monthly fee, ever."
        primaryHref="/partners/apply"
        primaryLabel="Apply now"
      />
    </SiteLayout>
  );
}
