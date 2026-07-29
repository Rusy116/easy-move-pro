import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import { ReviewDialog } from "@/components/customer/ReviewDialog";
import { routeLabel, useMyMoves, useMyReviews } from "@/lib/customer-portal";

export const Route = createFileRoute("/_authenticated/customer/reviews")({
  head: () => ({
    meta: [
      { title: "My Reviews — Easy Moving" },
      {
        name: "description",
        content: "Rate your completed moves and help other customers pick a great mover.",
      },
    ],
  }),
  component: CustomerReviewsPage,
});

function CustomerReviewsPage() {
  const { moves, loading } = useMyMoves();
  const { reviews, loading: loadingReviews, reload } = useMyReviews();
  const [target, setTarget] = useState<string | null>(null);

  const completed = useMemo(
    () => moves.filter((m) => m.lead_status === "completed"),
    [moves],
  );
  const reviewed = new Set(reviews.map((r) => r.quote_id));

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="Reviews"
            title="Rate your movers"
            subtitle="One review per completed move"
            icon={<Star className="h-5 w-5" />}
          />

          <div className="mt-6 space-y-4">
            <SectionShell title="Completed moves">
              {loading ? (
                <SkeletonRows n={2} />
              ) : completed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Once a move is completed you&apos;ll be able to review your mover here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {completed.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{routeLabel(m)}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.quote_number ?? m.id.slice(0, 8)} ·{" "}
                          {m.final_move_date ?? m.move_date ?? ""}
                        </div>
                      </div>
                      {reviewed.has(m.id) ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full">
                            Reviewed
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => setTarget(m.id)}
                          >
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => setTarget(m.id)}
                        >
                          Leave a review
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>

            <SectionShell title="Your reviews">
              {loadingReviews ? (
                <SkeletonRows n={1} />
              ) : reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{r.title || "Review"}</div>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: r.rating_overall }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                      </div>
                      {r.body && (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                          {r.body}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Professionalism {r.rating_professionalism}/5</span>
                        <span>Communication {r.rating_communication}/5</span>
                        <span>Punctuality {r.rating_punctuality}/5</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>
          </div>

          {target && (
            <ReviewDialog
              open={!!target}
              onOpenChange={(v) => !v && setTarget(null)}
              quoteId={target}
              onSaved={reload}
            />
          )}
        </section>
      </div>
    </CustomerShell>
  );
}
