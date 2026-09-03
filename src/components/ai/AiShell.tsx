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
  Database,
  ShieldCheck,
  Network,
  Factory,

} from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useT } from "@/i18n";

export const AI_NAV = [
  { to: "/ai/dashboard", labelKey: "admin.ai.nav.dashboard", icon: BarChart3 },
  { to: "/ai/supervisor", labelKey: "admin.ai.nav.supervisor", icon: ShieldCheck },
  { to: "/ai/orchestrator", labelKey: "admin.ai.nav.orchestrator", icon: Brain },
  { to: "/ai/ecosystem", labelKey: "admin.ai.nav.ecosystem", icon: Network },
  { to: "/ai/registry", labelKey: "admin.ai.nav.registry", icon: BookUser },
  { to: "/ai/queue", labelKey: "admin.ai.nav.queue", icon: ListOrdered },
  { to: "/ai/monitor", labelKey: "admin.ai.nav.monitor", icon: Gauge },
  { to: "/ai/activity", labelKey: "admin.ai.nav.activity", icon: Activity },
  { to: "/ai/performance", labelKey: "admin.ai.nav.performance", icon: LineChart },
  { to: "/ai/notifications", labelKey: "admin.ai.nav.notifications", icon: Bell },
  { to: "/ai/workforce", labelKey: "admin.ai.nav.workforce", icon: Bot },
  { to: "/ai/seo", labelKey: "admin.ai.nav.seo", icon: Search },
  { to: "/ai/usa-data", labelKey: "admin.ai.nav.usaData", icon: Database },
  { to: "/ai/cities", labelKey: "admin.ai.nav.cities", icon: MapPin },
  { to: "/ai/city-review", labelKey: "admin.ai.nav.cityReview", icon: ClipboardCheck },
  { to: "/ai/blog-review", labelKey: "admin.ai.nav.blogReview", icon: FileText },
  { to: "/ai/city-log", labelKey: "admin.ai.nav.cityLog", icon: ScrollText },
  { to: "/ai/city-index", labelKey: "admin.ai.nav.cityIndex", icon: Radar },
  { to: "/ai/city-factory", labelKey: "admin.ai.nav.cityFactory", icon: ShieldCheck },
  { to: "/ai/production", labelKey: "admin.ai.nav.production", icon: Factory },

  { to: "/ai/products", labelKey: "admin.ai.nav.products", icon: Package },
  { to: "/ai/product-factory", labelKey: "admin.ai.nav.productFactory", icon: Factory },
  { to: "/ai/content", labelKey: "admin.ai.nav.content", icon: FileText },
  { to: "/ai/publishing", labelKey: "admin.ai.nav.publishing", icon: Send },
  { to: "/ai/analytics", labelKey: "admin.ai.nav.analytics", icon: LineChart },
  { to: "/ai/automation", labelKey: "admin.ai.nav.automation", icon: Workflow },
  { to: "/ai/settings", labelKey: "admin.ai.nav.settings", icon: Settings },
];


/**
 * Layout for the AI Growth Center. Completely independent from the CRM /
 * marketplace shells — adding a new AI page only means adding an entry to
 * AI_NAV plus a route file.
 */
export function AiShell({ children }: { children: ReactNode }) {
  const t = useT();
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
            <span className="min-w-0 truncate">{t(item.labelKey)}</span>
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
                  {t("admin.ai.shell.brandTag")}
                </div>
                <div className="font-serif text-base">{t("admin.ai.shell.brandTitle")}</div>
              </div>
            </Link>
            {nav}
            <Link
              to="/admin/dashboard"
              className="mt-auto rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("admin.ai.shell.backToAdmin")}
            </Link>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Mobile header */}
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-ochre" />
                <span className="font-serif text-lg">{t("admin.ai.shell.brandTitle")}</span>
              </div>
              <button
                className="rounded-md p-2 hover:bg-accent"
                onClick={() => setOpen((v) => !v)}
                aria-label={t("admin.ai.shell.toggleMenu")}
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
