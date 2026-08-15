import { useEffect, useRef, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Star,
  Truck,
} from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/customer/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/customer/move", label: "Move", icon: <Truck className="h-4 w-4" /> },
  { to: "/customer/quotes", label: "Quotes", icon: <ClipboardList className="h-4 w-4" /> },
  { to: "/customer/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
  { to: "/customer/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { to: "/customer/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { to: "/customer/library", label: "Library", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/customer/reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> },
  { to: "/customer/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

/**
 * Links guest purchases and calculator estimates made with this email address
 * to the signed-in account. Runs once per page session; the RPC is idempotent.
 */
function useClaimGuestRecords() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void (supabase as unknown as { rpc: (fn: string) => Promise<unknown> })
      .rpc("fn_claim_my_records")
      .catch(() => undefined);
  }, []);
}

export function CustomerShell({ children }: { children: ReactNode }) {
  useClaimGuestRecords();
  return (
    <RoleGuard allow={["customer"]}>
      <RoleShell brand="Easy Moving" eyebrow="Customer" accent="customer" nav={NAV}>
        {children}
      </RoleShell>
    </RoleGuard>
  );
}
