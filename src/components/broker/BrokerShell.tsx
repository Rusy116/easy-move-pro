import type { ReactNode } from "react";
import { Inbox, BarChart3 } from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";
import { RoleGuard } from "@/components/auth/RoleGuard";

const NAV = [
  { to: "/broker", label: "Leads", icon: <Inbox className="h-4 w-4" /> },
  { to: "/broker/performance", label: "Performance", icon: <BarChart3 className="h-4 w-4" /> },
];

export function BrokerShell({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allow={["broker"]}>
      <RoleShell brand="Easy Move Pro" eyebrow="Broker" accent="broker" nav={NAV}>
        {children}
      </RoleShell>
    </RoleGuard>
  );
}
