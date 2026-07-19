import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  viewed_at: string | null;
  quoted_at: string | null;
  declined_at: string | null;
  won_at: string | null;
  lost_at: string | null;
  quoted_amount: number | null;
};

export const ASSIGN_STAGES = [
  "invited",
  "viewed",
  "quoted",
  "negotiating",
  "accepted",
  "declined",
  "won",
  "lost",
] as const;
export type AssignStage = (typeof ASSIGN_STAGES)[number];

export const ASSIGN_STAGE_STYLES: Record<string, string> = {
  invited: "bg-blue-100 text-blue-800 border-blue-300",
  assigned: "bg-blue-100 text-blue-800 border-blue-300",
  viewed: "bg-sky-100 text-sky-800 border-sky-300",
  contacted: "bg-sky-100 text-sky-800 border-sky-300",
  quoted: "bg-purple-100 text-purple-800 border-purple-300",
  negotiating: "bg-amber-100 text-amber-800 border-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  declined: "bg-neutral-200 text-neutral-700 border-neutral-300",
  won: "bg-emerald-600 text-white border-emerald-700",
  lost: "bg-rose-100 text-rose-800 border-rose-300",
};

function stageStampField(stage: string): keyof Assignment | null {
  switch (stage) {
    case "viewed": return "viewed_at";
    case "quoted": return "quoted_at";
    case "declined": return "declined_at";
    case "won": return "won_at";
    case "lost": return "lost_at";
    default: return null;
  }
}

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
      .insert({
        quote_id: quoteId,
        company_id: companyId,
        status: "invited",
        assigned_by: userData.user?.id,
      })
      .select("*")
      .single();
    setBusy(null);
    if (error) return toast.error(error.message);
    setAssignments((prev) => [...prev, data as Assignment]);
    toast.success("Invited");
  }

  async function unassign(a: Assignment) {
    setBusy(a.id);
    const { error } = await supabase.from("quote_assignments").delete().eq("id", a.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    setAssignments((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Removed");
  }

  async function updateStage(a: Assignment, stage: AssignStage) {
    const patch: Record<string, unknown> = { status: stage };
    const stamp = stageStampField(stage);
    if (stamp && !a[stamp]) patch[stamp] = new Date().toISOString();
    const { data, error } = await supabase
      .from("quote_assignments")
      .update(patch)
      .eq("id", a.id)
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setAssignments((prev) => prev.map((x) => (x.id === a.id ? (data as Assignment) : x)));
  }

  async function updateQuoted(a: Assignment, amount: number | null) {
    const { data, error } = await supabase
      .from("quote_assignments")
      .update({ quoted_amount: amount })
      .eq("id", a.id)
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setAssignments((prev) => prev.map((x) => (x.id === a.id ? (data as Assignment) : x)));
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Building2 className="h-4 w-4" />
        Assigned moving companies ({assignments.length})
      </div>

      {assignments.length === 0 && (
        <p className="text-sm text-muted-foreground mb-3">
          Not yet assigned. Invite one or more companies below.
        </p>
      )}

      <div className="space-y-2">
        {assignments.map((a) => {
          const c = companies.find((x) => x.id === a.company_id);
          return (
            <div
              key={a.id}
              className="rounded-lg border border-border bg-background p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{c?.name ?? "Unknown company"}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Invited {new Date(a.created_at).toLocaleDateString()}
                    {a.viewed_at && ` · Viewed ${new Date(a.viewed_at).toLocaleDateString()}`}
                    {a.quoted_at && ` · Quoted ${new Date(a.quoted_at).toLocaleDateString()}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void unassign(a)}
                  disabled={busy === a.id}
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select value={a.status} onValueChange={(v) => void updateStage(a, v as AssignStage)}>
                  <SelectTrigger className={`h-7 w-[140px] text-xs capitalize border ${ASSIGN_STAGE_STYLES[a.status] ?? ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGN_STAGES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="inline-flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Quoted $</span>
                  <Input
                    type="number"
                    className="h-7 w-24 text-xs"
                    placeholder="0"
                    defaultValue={a.quoted_amount ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim() === "" ? null : Number(e.target.value);
                      if (v !== a.quoted_amount) void updateQuoted(a, v);
                    }}
                  />
                </div>
                {a.status === "won" && (
                  <Badge className="bg-emerald-600 text-white">WON</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {available.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1.5">Invite companies:</div>
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
