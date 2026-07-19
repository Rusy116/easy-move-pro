import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";

const NAV = [
  { to: "/company", label: "Assigned leads", icon: <Inbox className="h-4 w-4" /> },
];

export function CompanyShell({ children }: { children: ReactNode }) {
  return (
    <RoleShell brand="Easy Moving" eyebrow="Moving company" accent="company" nav={NAV}>
      {children}
    </RoleShell>
  );
}
