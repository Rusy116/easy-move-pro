import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import { useCustomerPurchases } from "@/lib/customer-portal";

export const Route = createFileRoute("/_authenticated/customer/library")({
  head: () => ({
    meta: [
      { title: "My Library — Easy Moving" },
      {
        name: "description",
        content: "Download the moving guides, checklists and templates you own.",
      },
    ],
  }),
  component: MyLibraryPage,
});

function MyLibraryPage() {
  const { items, loading } = useCustomerPurchases();

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="My library"
            title="Your digital products"
            subtitle="Guides, checklists and templates you've purchased"
            icon={<BookOpen className="h-5 w-5" />}
          />

          <div className="mt-6">
            <SectionShell>
              {loading ? (
                <SkeletonRows n={2} />
              ) : items.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-serif text-lg">Your library is empty</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Purchased guides and templates will appear here, ready to download.
                  </p>
                  <Link to="/products" className="mt-4 inline-block">
                    <Button variant="secondary" className="rounded-full">
                      Browse the store
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {items.map((p) => (
                    <li key={p.id} className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-serif text-lg">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Purchased {new Date(p.purchased_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full">
                          v{p.version}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <Button
                          asChild={!!p.download_url}
                          size="sm"
                          className="rounded-full"
                          disabled={!p.download_url}
                        >
                          {p.download_url ? (
                            <a href={p.download_url} target="_blank" rel="noreferrer">
                              <Download className="mr-1.5 h-4 w-4" /> Download
                            </a>
                          ) : (
                            <span>
                              <Download className="mr-1.5 h-4 w-4" /> Preparing
                            </span>
                          )}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
