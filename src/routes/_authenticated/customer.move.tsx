import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Boxes,
  Calendar,
  MapPin,
  Package,
  Ruler,
  Star,
  Truck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import { MoveProgress, MoveTimeline } from "@/components/customer/MoveTimeline";
import { AssignedCompanyCard } from "@/components/customer/AssignedCompanyCard";
import { FinalPriceCard } from "@/components/customer/FinalPriceCard";
import { ReviewDialog } from "@/components/customer/ReviewDialog";
import {
  routeLabel,
  useAssignedCompany,
  useMoveTimeline,
  useMyMoves,
} from "@/lib/customer-portal";
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE } from "@/lib/lead-status";

export const Route = createFileRoute("/_authenticated/customer/move")({
  head: () => ({
    meta: [
      { title: "My Move — Easy Moving" },
      {
        name: "description",
        content:
          "Full details of your move: addresses, inventory, services, mover, timeline and final price.",
      },
    ],
  }),
  component: MyMovePage,
});

function MyMovePage() {
  const { activeMove: move, loading, reload } = useMyMoves();
  const { company } = useAssignedCompany(move?.assigned_company_id);
  const { entries } = useMoveTimeline(move?.id ?? null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const inventoryItems = Array.isArray(move?.inventory)
    ? (move?.inventory as Array<Record<string, unknown>>)
    : [];
  const totalItems = inventoryItems.reduce(
    (sum, i) => sum + (Number(i.qty ?? i.quantity ?? 0) || 0),
    0,
  );

  const services = [
    move?.packing && "Packing",
    move?.unpacking && "Unpacking",
    move?.storage && "Storage",
    move?.assembly && "Furniture assembly",
    move?.junk_removal && "Junk removal",
    move?.insurance_tier && `Insurance: ${move.insurance_tier}`,
  ].filter(Boolean) as string[];

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="My move"
            title={move ? routeLabel(move) : "My move"}
            subtitle={move?.quote_number ?? undefined}
            icon={<Truck className="h-5 w-5" />}
            actions={
              move?.lead_status === "completed" ? (
                <Button className="rounded-full" onClick={() => setReviewOpen(true)}>
                  <Star className="mr-1.5 h-4 w-4" /> Leave a review
                </Button>
              ) : undefined
            }
          />

          {loading ? (
            <div className="mt-8">
              <SkeletonRows n={4} />
            </div>
          ) : !move ? (
            <div className="mt-8 card-premium p-10 text-center">
              <p className="font-serif text-lg">No move to show yet</p>
              <Link to="/calculator" className="mt-4 inline-block">
                <Button className="rounded-full">Start a quote</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <SectionShell
                    title="Lead information"
                    right={
                      <Badge variant="outline" className={LEAD_STATUS_STYLE[move.lead_status]}>
                        {LEAD_STATUS_LABEL[move.lead_status]}
                      </Badge>
                    }
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        label="Origin address"
                        value={
                          move.origin_address ??
                          `${move.origin_city ?? ""} ${move.origin_state ?? ""} ${move.origin_zip}`
                        }
                      />
                      <Field
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        label="Destination address"
                        value={
                          move.destination_address ??
                          `${move.destination_city ?? ""} ${move.destination_state ?? ""} ${move.destination_zip}`
                        }
                      />
                      <Field
                        icon={<Calendar className="h-3.5 w-3.5" />}
                        label="Move date"
                        value={move.final_move_date ?? move.move_date ?? "To be scheduled"}
                      />
                      <Field
                        icon={<Truck className="h-3.5 w-3.5" />}
                        label="Move type"
                        value={move.move_type ?? "—"}
                      />
                      <Field
                        icon={<Package className="h-3.5 w-3.5" />}
                        label="Pickup property"
                        value={move.pickup_property_type ?? move.property_type}
                      />
                      <Field
                        icon={<Package className="h-3.5 w-3.5" />}
                        label="Delivery property"
                        value={move.delivery_property_type ?? move.property_type}
                      />
                      <Field
                        icon={<Ruler className="h-3.5 w-3.5" />}
                        label="Distance"
                        value={
                          move.distance_miles
                            ? `${Math.round(Number(move.distance_miles))} miles`
                            : "—"
                        }
                      />
                      <Field
                        icon={<UserRound className="h-3.5 w-3.5" />}
                        label="Assigned broker"
                        value={move.assigned_broker_id ? "Easy Moving broker team" : "Unassigned"}
                      />
                    </div>
                  </SectionShell>

                  <SectionShell title="Inventory summary">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <Stat label="Items" value={totalItems || inventoryItems.length || "—"} />
                      <Stat
                        label="Cubic feet"
                        value={
                          move.estimated_cubic_feet
                            ? Math.round(Number(move.estimated_cubic_feet)).toLocaleString()
                            : "—"
                        }
                      />
                      <Stat
                        label="Weight"
                        value={
                          move.estimated_weight_lbs
                            ? `${Math.round(Number(move.estimated_weight_lbs)).toLocaleString()} lbs`
                            : "—"
                        }
                      />
                      <Stat label="Truck" value={move.final_truck_size ?? "—"} />
                    </div>
                    {inventoryItems.length > 0 && (
                      <ul className="mt-4 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                        {inventoryItems.slice(0, 20).map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Boxes className="h-3.5 w-3.5 text-sage" />
                            <span className="truncate">
                              {String(item.label ?? item.name ?? "Item")}
                            </span>
                            <span className="ml-auto tabular-nums">
                              ×{String(item.qty ?? item.quantity ?? 1)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionShell>

                  <SectionShell title="Requested services">
                    <div className="flex flex-wrap gap-1.5">
                      {services.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Standard moving service
                        </span>
                      ) : (
                        services.map((s) => (
                          <Badge key={s} variant="outline" className="rounded-full capitalize">
                            {s}
                          </Badge>
                        ))
                      )}
                    </div>
                  </SectionShell>

                  <SectionShell title="Final price">
                    <FinalPriceCard move={move} onChanged={reload} />
                  </SectionShell>
                </div>

                <div className="space-y-4">
                  <SectionShell title="Move progress">
                    <MoveProgress status={move.lead_status} />
                  </SectionShell>
                  <SectionShell title="Assigned moving company">
                    <AssignedCompanyCard company={company} />
                    <div className="mt-3">
                      <Link to="/customer/messages">
                        <Button variant="secondary" size="sm" className="rounded-full">
                          Open messages
                        </Button>
                      </Link>
                    </div>
                  </SectionShell>
                  <SectionShell title="Move timeline">
                    <MoveTimeline entries={entries} />
                  </SectionShell>
                </div>
              </div>

              <ReviewDialog
                open={reviewOpen}
                onOpenChange={setReviewOpen}
                quoteId={move.id}
                onSaved={reload}
              />
            </>
          )}
        </section>
      </div>
    </CustomerShell>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex items-start gap-1.5 text-sm capitalize">
        {icon && <span className="mt-0.5 text-sage">{icon}</span>}
        <span className="break-words">{value}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 px-4 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="font-serif text-lg tabular-nums">{value}</div>
    </div>
  );
}
