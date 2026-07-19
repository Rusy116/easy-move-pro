import type { ReactNode } from "react";
import { LayoutDashboard, Building2 } from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";

const NAV = [
  { to: "/admin", label: "Quotes", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/admin/companies", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell brand="Easy Moving" eyebrow="Broker admin" accent="admin" nav={NAV}>
      {children}
    </RoleShell>
  );
}
