import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, CheckSquare, Play, Download, HelpCircle, Lightbulb } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs, InternalLinks, Cta, Faq } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { RESOURCES, RESOURCE_KINDS, type ResourceItem } from "@/lib/seo/public-content";

const TITLE = "Moving Resources — Free Guides, Checklists & Downloads | Easy Moving";
const DESC =
  "Free moving guides, printable checklists, budget worksheets, videos and expert tips for local, long-distance and interstate relocations.";

const FAQ = [
  {
    q: "Are these moving resources free?",
    a: "Yes. Every guide, checklist, video and download in the resources center is free to use.",
  },
  {
    q: "What is the difference between resources and the store?",
    a: "Resources are free reference material. The digital store sells polished, editable planning products such as full budget workbooks and inventory systems.",
  },
  {
    q: "How far in advance should I start planning?",
    a: "Eight weeks is comfortable for a household move, four weeks is workable, and two weeks is possible with full-service packing.",
  },
];

const ICONS: Record<ResourceItem["kind"], typeof BookOpen> = {
  guide: BookOpen,
  checklist: CheckSquare,
  video: Play,
  download: Download,
  faq: HelpCircle,
  tip: Lightbulb,
};

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESC, path: "/resources" }),
    links: [{ rel: "canonical", href: "/resources" }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Resources", url: "/resources" },
        ]),
      ),
      jsonLd(faqSchema(FAQ)),
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const [kind, setKind] = useState<ResourceItem["kind"] | "all">("all");
  const items = kind === "all" ? RESOURCES : RESOURCES.filter((r) => r.kind === kind);

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Resources" }]} />
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
            Free resources
          </span>
          <h1 className="mt-3 font-serif text-5xl font-medium">
            Everything you need to move well.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Guides, checklists, videos and downloads written by relocation coordinators who have
            packed thousands of homes.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <FilterChip active={kind === "all"} onClick={() => setKind("all")}>
              All
            </FilterChip>
            {RESOURCE_KINDS.map((k) => (
              <FilterChip key={k.key} active={kind === k.key} onClick={() => setKind(k.key)}>
                {k.label}
              </FilterChip>
            ))}
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => {
              const Icon = ICONS[r.kind];
              return (
                <article
                  key={r.slug}
                  className="flex flex-col rounded-2xl border border-border bg-card p-6"
                >
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="font-serif text-xl font-medium">{r.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {r.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-2.5 py-1 capitalize">
                      {r.kind}
                    </span>
                    {r.minutes && <span>{r.minutes} min</span>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Faq items={FAQ} />

      <InternalLinks
        title="Keep exploring"
        links={[
          { label: "Moving guides & blog", to: "/blog" },
          { label: "Digital products", to: "/store" },
          { label: "AI moving tools", to: "/ai-tools" },
          { label: "Movers by state", to: "/states" },
          { label: "Popular routes", to: "/routes" },
        ]}
      />
      <Cta
        title="Know what your move actually costs"
        subhead="Free, itemized, and no phone call required."
        primaryHref="/calculator"
        primaryLabel="Get my exact quote"
      />
    </SiteLayout>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
