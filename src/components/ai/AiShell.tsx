import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  Search,
  Package,
  FileText,
  Send,
  LineChart,
  Workflow,
  Settings,
  Sparkles,
  Menu,
  X,
  Brain,
  ListOrdered,
  Activity,
  Gauge,
  Bell,
  BookUser,
  MapPin,
  ClipboardCheck,
  ScrollText,
  Radar,

} from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";

export const AI_NAV = [
  { to: "/ai/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/ai/orchestrator", label: "Orchestrator", icon: Brain },
  { to: "/ai/registry", label: "Agent Registry", icon: BookUser },
  { to: "/ai/queue", label: "Task Queue", icon: ListOrdered },
  { to: "/ai/monitor", label: "Queue Monitor", icon: Gauge },
  { to: "/ai/activity", label: "Activity Timeline", icon: Activity },
  { to: "/ai/performance", label: "Agent Performance", icon: LineChart },
  { to: "/ai/notifications", label: "Notifications", icon: Bell },
  { to: "/ai/workforce", label: "AI Workforce", icon: Bot },
  { to: "/ai/seo", label: "SEO Factory", icon: Search },
  { to: "/ai/cities", label: "City Landing Agent", icon: MapPin },
  { to: "/ai/city-review", label: "Draft Review Queue", icon: ClipboardCheck },
  { to: "/ai/city-log", label: "Publish Log", icon: ScrollText },
  { to: "/ai/city-index", label: "Index Monitor", icon: Radar },

  { to: "/ai/products", label: "Digital Product Factory", icon: Package },
  { to: "/ai/content", label: "Content Factory", icon: FileText },
  { to: "/ai/publishing", label: "Publishing Center", icon: Send },
  { to: "/ai/analytics", label: "Analytics", icon: LineChart },
  { to: "/ai/automation", label: "Automation", icon: Workflow },
  { to: "/ai/settings", label: "Settings", icon: Settings },
];


/**
 * Layout for the AI Growth Center. Completely independent from the CRM /
 * marketplace shells — adding a new AI page only means adding an entry to
 * AI_NAV plus a route file.
 */
export function AiShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {AI_NAV.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <RoleGuard allow={["admin"]}>
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-6 sm:px-6">
          {/* Desktop left menu */}
          <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col overflow-y-auto rounded-2xl border border-border bg-card p-4 lg:flex">
            <Link to="/admin/dashboard" className="mb-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sage to-ochre text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Easy Moving
                </div>
                <div className="font-serif text-base">AI Growth Center</div>
              </div>
            </Link>
            {nav}
            <Link
              to="/admin/dashboard"
              className="mt-auto rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to Broker admin
            </Link>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Mobile header */}
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-ochre" />
                <span className="font-serif text-lg">AI Growth Center</span>
              </div>
              <button
                className="rounded-md p-2 hover:bg-accent"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle AI menu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
            {open && (
              <div className="mb-4 rounded-2xl border border-border bg-card p-3 lg:hidden">
                {nav}
              </div>
            )}
            <div className="space-y-6 pb-16">{children}</div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
