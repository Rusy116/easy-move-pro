import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import { useCustomerNotifications } from "@/lib/customer-portal";

export const Route = createFileRoute("/_authenticated/customer/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Easy Moving" },
      {
        name: "description",
        content: "Every update about your move, from submission to completion.",
      },
    ],
  }),
  component: CustomerNotificationsPage,
});

function CustomerNotificationsPage() {
  const { items, unread, loading, markRead, markAllRead } = useCustomerNotifications(100);

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="Notifications"
            title="Move updates"
            subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
            icon={<Bell className="h-5 w-5" />}
            actions={
              unread > 0 ? (
                <Button variant="secondary" className="rounded-full" onClick={markAllRead}>
                  <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
                </Button>
              ) : undefined
            }
          />

          <div className="mt-6">
            <SectionShell>
              {loading ? (
                <SkeletonRows n={4} />
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No notifications yet. We&apos;ll let you know as your move progresses.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((n) => (
                    <li
                      key={n.id}
                      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${
                        n.read_at ? "border-border/50" : "border-ochre/40 bg-ochre/5"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{n.title}</span>
                          {!n.read_at && (
                            <Badge variant="outline" className="rounded-full text-[10px]">
                              New
                            </Badge>
                          )}
                        </div>
                        {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!n.read_at && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => markRead(n.id)}
                        >
                          Mark read
                        </Button>
                      )}
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
