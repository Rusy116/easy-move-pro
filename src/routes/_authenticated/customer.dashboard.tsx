import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  DollarSign,
  MapPin,
  Shield,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell, SkeletonRows, StatCard } from "@/components/shell/Chrome";
import { MoveProgress, MoveTimeline } from "@/components/customer/MoveTimeline";
import { AssignedCompanyCard } from "@/components/customer/AssignedCompanyCard";
import {
  money,
  routeLabel,
  useAssignedCompany,
  useCustomerNotifications,
  useMoveTimeline,
  useMyMoves,
} from "@/lib/customer-portal";
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE } from "@/lib/lead-status";

export const Route = createFileRoute("/_authenticated/customer/dashboard")({
  head: () => ({
    meta: [
      { title: "Customer Dashboard — Easy Moving" },
      {
        name: "description",
        content: "Track your move status, moving company, price and activity in one place.",
      },
    ],
  }),
  component: CustomerDashboard,
});

function CustomerDashboard() {
  const { activeMove, moves, loading } = useMyMoves();
  const { company } = useAssignedCompany(activeMove?.assigned_company_id);
  const { entries } = useMoveTimeline(activeMove?.id ?? null);
  const { items: notifications, unread } = useCustomerNotifications(5);

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="Customer dashboard"
            title="Your move at a glance"
            subtitle={activeMove ? routeLabel(activeMove) : "No active move yet"}
            icon={<Shield className="h-5 w-5" />}
            actions={
              <Link to="/customer/move">
                <Button className="rounded-full shadow-sm">
                  View my move <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            }
          />

          {loading ? (
            <div className="mt-8">
              <SkeletonRows n={3} />
            </div>
          ) : !activeMove ? (
            <div className="mt-8 card-premium p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sage-soft text-sage">
                <Truck className="h-6 w-6" />
              </div>
              <p className="mt-4 font-serif text-lg">No moves yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get an instant estimate in under a minute.
              </p>
              <Link to="/calculator" className="mt-4 inline-block">
                <Button className="rounded-full">Get your first quote</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Move status"
                  value={
                    <span className="text-xl">{LEAD_STATUS_LABEL[activeMove.lead_status]}</span>
                  }
                  hint={new Date(activeMove.lead_status_updated_at).toLocaleDateString()}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  tone="info"
                />
                <StatCard
                  label="Moving company"
                  value={<span className="text-xl">{company?.name ?? "Pending"}</span>}
                  hint={company?.phone ?? "Assigned once claimed"}
                  icon={<Truck className="h-4 w-4" />}
                />
                <StatCard
                  label="Move date"
                  value={
                    <span className="text-xl">
                      {activeMove.final_move_date ?? activeMove.move_date ?? "TBD"}
                    </span>
                  }
                  hint={activeMove.arrival_window ?? "Arrival window pending"}
                  icon={<Calendar className="h-4 w-4" />}
                />
                <StatCard
                  label="Final price"
                  value={
                    activeMove.final_price != null
                      ? money(activeMove.final_price)
                      : `${money(activeMove.estimated_low)}+`
                  }
                  hint={activeMove.final_price != null ? "Confirmed" : "Broker estimate"}
                  tone="success"
                  icon={<DollarSign className="h-4 w-4" />}
                />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <SectionShell title="Move progress">
                  <MoveProgress status={activeMove.lead_status} />
                </SectionShell>

                <SectionShell
                  title="Assigned mover"
                  right={
                    <Link
                      to="/customer/move"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Details
                    </Link>
                  }
                >
                  <AssignedCompanyCard company={company} />
                </SectionShell>

                <SectionShell
                  title="Notifications"
                  right={
                    unread > 0 ? (
                      <Badge variant="outline" className="rounded-full">
                        {unread} new
                      </Badge>
                    ) : null
                  }
                >
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
                  ) : (
                    <ul className="space-y-3">
                      {notifications.map((n) => (
                        <li key={n.id} className="flex items-start gap-2.5">
                          <Bell
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              n.read_at ? "text-muted-foreground/50" : "text-ochre"
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{n.title}</div>
                            {n.body && (
                              <div className="text-xs text-muted-foreground">{n.body}</div>
                            )}
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    to="/customer/notifications"
                    className="mt-4 inline-flex text-xs text-muted-foreground hover:text-foreground"
                  >
                    View all notifications →
                  </Link>
                </SectionShell>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <SectionShell title="Recent activity">
                  <MoveTimeline entries={[...entries].reverse().slice(0, 8)} />
                </SectionShell>

                <SectionShell
                  title="Your moves"
                  right={
                    <Link
                      to="/customer/quotes"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      All quotes
                    </Link>
                  }
                >
                  <ul className="space-y-3">
                    {moves.slice(0, 4).map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <MapPin className="h-3.5 w-3.5 text-sage" />
                            <span className="truncate">{routeLabel(m)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.quote_number ?? m.id.slice(0, 8)} ·{" "}
                            {new Date(m.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline" className={LEAD_STATUS_STYLE[m.lead_status]}>
                          {LEAD_STATUS_LABEL[m.lead_status]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </SectionShell>
              </div>
            </>
          )}
        </section>
      </div>
    </CustomerShell>
  );
}
