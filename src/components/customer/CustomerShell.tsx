import type { ReactNode } from "react";
import {
  Bell,
  BookOpen,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
  Star,
  Truck,
} from "lucide-react";
import { RoleShell } from "@/components/shell/RoleShell";
import { RoleGuard } from "@/components/auth/RoleGuard";

const NAV = [
  { to: "/customer", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/customer/move", label: "My move", icon: <Truck className="h-4 w-4" /> },
  { to: "/customer/quotes", label: "My quotes", icon: <ClipboardList className="h-4 w-4" /> },
  { to: "/customer/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
  { to: "/customer/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { to: "/customer/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { to: "/customer/library", label: "My library", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/customer/reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> },
  { to: "/customer/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
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
