import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Inbox,
  Globe,
  FileText,
  Calendar,
  CalendarCheck,

  Users,
  MessageSquare,
  Receipt,
  Bell,
  FolderOpen,
  Building2,
  Settings,
  Wallet,
  ShieldAlert,
  Clock,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { supabase } from "@/integrations/supabase/client";

const FULL_NAV = [
  { to: "/company/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/company/marketplace", label: "Marketplace", icon: <Globe className="h-4 w-4" /> },
  { to: "/company/leads", label: "Leads", icon: <Inbox className="h-4 w-4" /> },
  { to: "/company/current", label: "Current Jobs", icon: <Truck className="h-4 w-4" /> },
  { to: "/company/completed", label: "Completed Jobs", icon: <CheckCircle2 className="h-4 w-4" /> },
  { to: "/company/estimates", label: "Estimates", icon: <FileText className="h-4 w-4" /> },
  { to: "/company/scheduled", label: "Scheduled", icon: <CalendarCheck className="h-4 w-4" /> },

  { to: "/company/customers", label: "Customers", icon: <Users className="h-4 w-4" /> },
  { to: "/company/invoices", label: "Invoices", icon: <Receipt className="h-4 w-4" /> },
  { to: "/company/finance", label: "Finance", icon: <Wallet className="h-4 w-4" /> },
  { to: "/company/documents", label: "Documents", icon: <FolderOpen className="h-4 w-4" /> },
  { to: "/company/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
  { to: "/company/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { to: "/company/schedule", label: "Schedule", icon: <Calendar className="h-4 w-4" /> },
  { to: "/company/profile", label: "Profile", icon: <Building2 className="h-4 w-4" /> },
  { to: "/company/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

/**
 * Routes kept live but hidden from navigation (duplicates / secondary surfaces):
 * /company (redirect), /company/hub, /company/myjobs, /company/exclusive,
 * /company/expired, /company/history, /company/analytics, /company/support,
 * /company/job/$jobId.
 */

/** Companies awaiting review (or rejected) only see onboarding surfaces. */
const RESTRICTED_PATHS = [
  "/company/profile",
  "/company/documents",
  "/company/settings",
];
const RESTRICTED_NAV = FULL_NAV.filter((n) => RESTRICTED_PATHS.includes(n.to));


export function CompanyShell({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("moving_companies")
        .select("status, rejection_reason")
        .limit(1);
      if (cancelled) return;
      const row = (data?.[0] ?? null) as {
        status?: string;
        rejection_reason?: string | null;
      } | null;
      setStatus(row?.status ?? "pending");
      setReason(row?.rejection_reason ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const gated = status === "pending" || status === "rejected";
  const nav = gated ? RESTRICTED_NAV : FULL_NAV;

  return (
    <RoleGuard allow={["mover"]}>
      <RoleShell brand="Easy Moving" eyebrow="Moving company" accent="company" nav={nav}>
        {status === "pending" && (
          <Banner tone="amber" icon={<Clock className="h-4 w-4" />}>
            Your application is awaiting administrator approval. You can complete your profile,
            upload documents and adjust your settings in the meantime.
          </Banner>
        )}
        {status === "rejected" && (
          <Banner tone="rose" icon={<ShieldAlert className="h-4 w-4" />}>
            Your application was rejected{reason ? `: ${reason}` : "."} Update your company
            information and documents, then contact support to resubmit for review.
          </Banner>
        )}
        {status === "suspended" && (
          <Banner tone="rose" icon={<ShieldAlert className="h-4 w-4" />}>
            Your account is suspended. You will not receive new leads. Completed jobs, invoices and
            documents remain available.
          </Banner>
        )}
        {children}
      </RoleShell>
    </RoleGuard>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "amber" | "rose";
  icon: ReactNode;
  children: ReactNode;
}) {
  const cls =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-rose-300 bg-rose-50 text-rose-900";
  return (
    <div
      className={`mx-auto mt-4 flex max-w-6xl items-start gap-2 rounded-xl border px-4 py-3 text-sm ${cls}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}
