import type { ReactNode } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";
import { RoleGuard } from "@/components/auth/RoleGuard";

const NAV = [
  { to: "/customer", label: "My quotes", icon: <ClipboardList className="h-4 w-4" /> },
  { to: "/calculator", label: "New quote", icon: <Plus className="h-4 w-4" /> },
];

export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allow={["customer"]}>
      <RoleShell brand="Easy Moving" eyebrow="Customer" accent="customer" nav={NAV}>
        {children}
      </RoleShell>
    </RoleGuard>
  );
}
