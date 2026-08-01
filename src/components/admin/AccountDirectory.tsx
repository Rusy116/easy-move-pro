import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ViewAsUserButton } from "@/components/admin/ViewAsUserButton";
import {
  adminListImpersonatableUsers,
  type ImpersonatableUser,
} from "@/lib/impersonation.functions";

const TABS = [
  { key: "all", label: "All accounts" },
  { key: "customer", label: "Customers" },
  { key: "broker", label: "Brokers" },
  { key: "mover", label: "Companies" },
  { key: "admin", label: "Admins" },
] as const;

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/10 text-primary border-primary/30",
  broker: "bg-sky-50 text-sky-800 border-sky-300",
  mover: "bg-indigo-50 text-indigo-800 border-indigo-300",
  customer: "bg-emerald-50 text-emerald-800 border-emerald-300",
};

const ROLE_TEXT: Record<string, string> = {
  admin: "Administrator",
  broker: "Broker",
  mover: "Moving company",
  customer: "Customer",
};

/**
 * Searchable directory of every account on the platform with a
 * "View as User" action on each row.
 */
export function AccountDirectory({ defaultRole = "all" }: { defaultRole?: string }) {
  const listUsers = useServerFn(adminListImpersonatableUsers);
  const [role, setRole] = useState<string>(defaultRole);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ImpersonatableUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (r: string, s: string) => {
      setLoading(true);
      try {
        setRows(await listUsers({ data: { role: r, search: s } }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load accounts");
      } finally {
        setLoading(false);
      }
    },
    [listUsers],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(role, search), 250);
    return () => clearTimeout(t);
  }, [role, search, load]);

  return (
    <div className="card-premium p-5">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setRole(t.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              role === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, company"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {loading && (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No accounts match this filter.
          </div>
        )}
        {!loading &&
          rows.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  <Badge variant="outline" className={ROLE_BADGE[u.role]}>
                    {ROLE_TEXT[u.role]}
                  </Badge>
                  {u.status === "disabled" && (
                    <Badge className="border border-destructive/30 bg-destructive/10 text-destructive">
                      Disabled
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {u.email}
                  {u.company_name ? ` · ${u.company_name}` : ""}
                </div>
              </div>
              <ViewAsUserButton userId={u.id} disabled={u.status === "disabled"} />
            </div>
          ))}
      </div>
    </div>
  );
}
