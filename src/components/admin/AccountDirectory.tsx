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
import { useI18n } from "@/i18n";

const TABS = [
  { key: "all", labelKey: "admin.shell.accountDirectory.tabAll" },
  { key: "customer", labelKey: "admin.shell.accountDirectory.tabCustomer" },
  { key: "broker", labelKey: "admin.shell.accountDirectory.tabBroker" },
  { key: "mover", labelKey: "admin.shell.accountDirectory.tabMover" },
  { key: "admin", labelKey: "admin.shell.accountDirectory.tabAdmin" },
] as const;

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/10 text-primary border-primary/30",
  broker: "bg-sky-50 text-sky-800 border-sky-300",
  mover: "bg-indigo-50 text-indigo-800 border-indigo-300",
  customer: "bg-emerald-50 text-emerald-800 border-emerald-300",
};

const ROLE_TEXT_KEY: Record<string, string> = {
  admin: "admin.shell.accountDirectory.roleAdmin",
  broker: "admin.shell.accountDirectory.roleBroker",
  mover: "admin.shell.accountDirectory.roleMover",
  customer: "admin.shell.accountDirectory.roleCustomer",
};

/**
 * Searchable directory of every account on the platform with a
 * "View as User" action on each row.
 */
export function AccountDirectory({ defaultRole = "all" }: { defaultRole?: string }) {
  const { t: tr } = useI18n();
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
        toast.error(e instanceof Error ? e.message : tr("admin.shell.accountDirectory.loadError"));
      } finally {
        setLoading(false);
      }
    },
    [listUsers, tr],
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
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              role === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {tr(t.labelKey)}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("admin.shell.accountDirectory.searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {loading && (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {tr("admin.shell.accountDirectory.loading")}
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {tr("admin.shell.accountDirectory.empty")}
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
                  <span className="break-words font-medium">{u.name}</span>
                  <Badge variant="outline" className={`whitespace-normal break-words ${ROLE_BADGE[u.role]}`}>
                    {tr(ROLE_TEXT_KEY[u.role])}
                  </Badge>
                  {u.status === "disabled" && (
                    <Badge className="whitespace-normal break-words border border-destructive/30 bg-destructive/10 text-destructive">
                      {tr("admin.shell.accountDirectory.disabled")}
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
