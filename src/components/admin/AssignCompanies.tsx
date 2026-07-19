import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, X } from "lucide-react";

type Company = {
  id: string;
  name: string;
  license_status: string;
  service_states: string[];
  active: boolean;
};

type Assignment = {
  id: string;
  quote_id: string;
  company_id: string;
  status: string;
  created_at: string;
};

const ASSIGN_STATUS_STYLES: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-800 border-blue-300",
  contacted: "bg-amber-100 text-amber-800 border-amber-300",
  quoted: "bg-purple-100 text-purple-800 border-purple-300",
  won: "bg-emerald-100 text-emerald-800 border-emerald-300",
  lost: "bg-rose-100 text-rose-800 border-rose-300",
};

export function AssignCompanies({ quoteId }: { quoteId: string }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: asg }] = await Promise.all([
        supabase.from("moving_companies").select("*").eq("active", true).order("name"),
        supabase.from("quote_assignments").select("*").eq("quote_id", quoteId),
      ]);
      setCompanies((cs ?? []) as Company[]);
      setAssignments((asg ?? []) as Assignment[]);
    })();
  }, [quoteId]);

  const assignedIds = new Set(assignments.map((a) => a.company_id));
  const available = companies.filter((c) => !assignedIds.has(c.id));

  async function assign(companyId: string) {
    setBusy(companyId);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("quote_assignments")
      .insert({ quote_id: quoteId, company_id: companyId, assigned_by: userData.user?.id })
      .select("*")
      .single();
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAssignments((prev) => [...prev, data as Assignment]);
    toast.success("Assigned");
  }

  async function unassign(a: Assignment) {
    setBusy(a.id);
    const { error } = await supabase.from("quote_assignments").delete().eq("id", a.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAssignments((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Unassigned");
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Building2 className="h-4 w-4" />
        Assigned moving companies ({assignments.length})
      </div>

      {assignments.length === 0 && (
        <p className="text-sm text-muted-foreground mb-3">
          Not yet assigned. Pick one or more companies below.
        </p>
      )}

      <div className="space-y-2">
        {assignments.map((a) => {
          const c = companies.find((x) => x.id === a.company_id);
          return (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{c?.name ?? "Unknown company"}</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs ${ASSIGN_STATUS_STYLES[a.status] ?? ""}`}
                  >
                    {a.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void unassign(a)}
                disabled={busy === a.id}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {available.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1.5">Add companies:</div>
          <div className="flex flex-wrap gap-2">
            {available.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant="outline"
                onClick={() => void assign(c.id)}
                disabled={busy === c.id}
              >
                + {c.name}
                {c.service_states.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({c.service_states.join(",")})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {companies.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No companies yet.{" "}
          <a href="/admin/companies" className="text-primary hover:underline">
            Create one →
          </a>
        </p>
      )}
    </div>
  );
}
