import type { ReactNode } from "react";
import { LayoutDashboard, Building2, BarChart3, Users, Banknote } from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";
import { RoleGuard } from "@/components/auth/RoleGuard";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
  { to: "/admin", label: "Quotes", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/admin/companies", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
  { to: "/admin/finance", label: "Finance", icon: <Banknote className="h-4 w-4" /> },
  { to: "/admin/users", label: "Team", icon: <Users className="h-4 w-4" /> },
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
