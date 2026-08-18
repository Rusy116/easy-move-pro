import type { ReactNode } from "react";
import {
  Receipt,
  Inbox,
  Building2,
  BarChart3,
  Users,
  Banknote,
  Settings,
  Globe,
  Briefcase,
  LineChart,
  FileText,
  Sparkles,


} from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";
import { RoleGuard } from "@/components/auth/RoleGuard";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
  { to: "/admin/leads", label: "Leads", icon: <Inbox className="h-4 w-4" /> },
  { to: "/admin/marketplace", label: "Marketplace", icon: <Globe className="h-4 w-4" /> },
  { to: "/admin/companies", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
  { to: "/admin/brokers", label: "Brokers", icon: <Briefcase className="h-4 w-4" /> },
  { to: "/admin/customers", label: "Customers", icon: <Users className="h-4 w-4" /> },
  { to: "/admin/finance", label: "Finance", icon: <Banknote className="h-4 w-4" /> },
  { to: "/admin/invoices", label: "Invoices", icon: <FileText className="h-4 w-4" /> },
  { to: "/admin/orders", label: "Store orders", icon: <Receipt className="h-4 w-4" /> },

  { to: "/admin/reports", label: "Reports", icon: <LineChart className="h-4 w-4" /> },
  { to: "/ai/dashboard", label: "AI Growth", icon: <Sparkles className="h-4 w-4" /> },
  { to: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },

];



export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allow={["admin"]}>
      <RoleShell brand="Easy Moving" eyebrow="Broker admin" accent="admin" nav={NAV}>
        {children}
      </RoleShell>
    </RoleGuard>
  );
}
