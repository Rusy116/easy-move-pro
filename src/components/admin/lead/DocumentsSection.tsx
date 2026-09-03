import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, ExternalLink, Trash2 } from "lucide-react";
import { Empty, dateTime, type LeadQuote } from "./shared";
import { useT } from "@/i18n";

type Doc = {
  id: string;
  kind: string;
  name: string;
  external_url: string | null;
  storage_path: string | null;
  uploaded_by_email: string | null;
  created_at: string;
};

const KINDS = ["estimate", "contract", "inventory", "customer_upload", "photo", "other"];

export function DocumentsSection({ q }: { q: LeadQuote }) {
  const tr = useT();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [companyDocs, setCompanyDocs] = useState<Doc[]>([]);
  const [kind, setKind] = useState("estimate");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase
        .from("lead_documents")
        .select("*")
        .eq("quote_id", q.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("company_documents")
        .select("id, kind, name, external_url, storage_path, created_at")
        .eq("quote_id", q.id)
        .order("created_at", { ascending: false }),
    ]);
    setDocs((a as unknown as Doc[]) ?? []);
    setCompanyDocs(((b as unknown as Doc[]) ?? []).map((d) => ({ ...d, uploaded_by_email: null })));
  }, [q.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("lead_documents").insert({
      quote_id: q.id,
      kind,
      name: name.trim(),
      external_url: url.trim(),
      uploaded_by: u.user?.id ?? null,
      uploaded_by_email: u.user?.email ?? null,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    setName("");
    setUrl("");
    toast.success(tr("admin.shell.documents.linked"));
    void load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("lead_documents").delete().eq("id", id);
    if (error) toast.error(error.message);
    void load();
  }

  const all = [...docs, ...companyDocs];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border bg-card/50 p-3 sm:grid-cols-4">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {tr(`admin.shell.documents.kind.${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr("admin.shell.documents.namePlaceholder")}
          className="h-9"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={tr("admin.shell.documents.linkPlaceholder")}
          className="h-9"
        />
        <Button size="sm" className="h-9" onClick={() => void add()} disabled={saving}>
          {saving ? tr("admin.shell.documents.saving") : tr("admin.shell.documents.attach")}
        </Button>
      </div>

      {all.length === 0 ? (
        <Empty>{tr("admin.shell.documents.empty")}</Empty>
      ) : (
        <ul className="space-y-2">
          {all.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  <span>{tr(`admin.shell.documents.kind.${d.kind}`)}</span> · {dateTime(d.created_at)}
                  {d.uploaded_by_email ? ` · ${d.uploaded_by_email}` : ""}
                </div>
              </div>
              {d.external_url && (
                <a
                  href={d.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={tr("admin.shell.documents.open")}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {docs.some((x) => x.id === d.id) && (
                <button
                  type="button"
                  aria-label={tr("admin.shell.documents.remove")}
                  onClick={() => void remove(d.id)}
                  className="text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
