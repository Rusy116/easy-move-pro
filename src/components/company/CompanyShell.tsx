import type { ReactNode } from "react";
import {
  LayoutDashboard, Inbox, Lock, Globe, FileText, Calendar,
  Users, MessageSquare, Receipt, BarChart3, Bell, FolderOpen,
  Building2, Settings,
} from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";

const NAV = [
  { to: "/company/dashboard",     label: "Dashboard",     icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/company/leads",         label: "My Leads",      icon: <Inbox className="h-4 w-4" /> },
  { to: "/company/exclusive",     label: "Exclusive",     icon: <Lock className="h-4 w-4" /> },
  { to: "/company/marketplace",   label: "Marketplace",   icon: <Globe className="h-4 w-4" /> },
  { to: "/company/estimates",     label: "Estimates",     icon: <FileText className="h-4 w-4" /> },
  { to: "/company/schedule",      label: "Schedule",      icon: <Calendar className="h-4 w-4" /> },
  { to: "/company/customers",     label: "Customers",     icon: <Users className="h-4 w-4" /> },
  { to: "/company/messages",      label: "Messages",      icon: <MessageSquare className="h-4 w-4" /> },
  { to: "/company/invoices",      label: "Invoices",      icon: <Receipt className="h-4 w-4" /> },
  { to: "/company/documents",     label: "Documents",     icon: <FolderOpen className="h-4 w-4" /> },
  { to: "/company/analytics",     label: "Analytics",     icon: <BarChart3 className="h-4 w-4" /> },
  { to: "/company/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { to: "/company/profile",       label: "Profile",       icon: <Building2 className="h-4 w-4" /> },
  { to: "/company/settings",      label: "Settings",      icon: <Settings className="h-4 w-4" /> },
];

export function CompanyShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell brand="Easy Moving" eyebrow="Moving company" accent="company" nav={NAV}>
      {children}
    </RoleShell>
  );
}
