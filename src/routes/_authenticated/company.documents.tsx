import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FolderOpen, Upload, Search, Download, Trash2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/documents")({
  head: () => ({ meta: [{ title: "Documents — Company Portal" }] }),
  component: DocumentsPage,
});

type Doc = {
  id: string;
  company_id: string;
  quote_id: string | null;
  invoice_id: string | null;
  kind: string;
  name: string;
  storage_path: string | null;
  external_url: string | null;
  mime: string | null;
  size_bytes: number | null;
  version: number;
  parent_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};

const KINDS = [
  "all",
  "estimate",
  "invoice",
  "bill_of_lading",
  "contract",
  "insurance",
  "license",
  "photo",
  "attachment",
  "other",
] as const;

function fmtSize(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPage() {
  const { loading, company, reload } = useMoverPortal();
  const [rows, setRows] = useState<Doc[]>([]);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [q, setQ] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    if (!company) return;
    const { data } = await supabase
      .from("company_documents")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    setRows((data as Doc[] | null) ?? []);
  }, [company]);
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (q.trim() && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, kind, q]);

  // Group versions
  const grouped = useMemo(() => {
    const heads = filtered.filter((r) => !r.parent_id);
    return heads.map((h) => ({
      head: h,
      versions: filtered.filter((r) => r.parent_id === h.id).sort((a, b) => b.version - a.version),
    }));
  }, [filtered]);

  async function download(d: Doc) {
    if (d.external_url) {
      window.open(d.external_url, "_blank");
      return;
    }
    if (!d.storage_path) return;
    const { data, error } = await supabase.storage
      .from("company-documents")
      .createSignedUrl(d.storage_path, 300);
    if (error || !data) {
      toast.error(error?.message ?? "Failed");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }
  async function del(d: Doc) {
    if (!confirm(`Delete "${d.name}"?`)) return;
    if (d.storage_path) await supabase.storage.from("company-documents").remove([d.storage_path]);
    const { error } = await supabase.from("company_documents").delete().eq("id", d.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      void load();
    }
  }

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="card-premium p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Documents</h2>
            <span className="text-sm text-muted-foreground">({rows.length})</span>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Upload
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search documents…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-2.5 py-1 text-xs rounded-full border capitalize ${kind === k ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:bg-muted"}`}
              >
                {k.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {grouped.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">No documents yet.</div>
            </div>
          )}
          {grouped.map(({ head, versions }) => (
            <div key={head.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-muted grid place-items-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{head.name}</span>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {head.kind.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        v{head.version}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(head.created_at).toLocaleString()} · {fmtSize(head.size_bytes)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => void download(head)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void del(head)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {versions.length > 0 && (
                <div className="mt-2 ml-12 space-y-1 border-l border-border pl-3">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        v{v.version} · {new Date(v.created_at).toLocaleDateString()} ·{" "}
                        {fmtSize(v.size_bytes)}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void download(v)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void del(v)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {uploadOpen && company && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          companyId={company.id}
          existingHeads={rows.filter((r) => !r.parent_id)}
          onDone={() => {
            void load();
            setUploadOpen(false);
          }}
        />
      )}
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  companyId,
  existingHeads,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  existingHeads: Doc[];
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("attachment");
  const [parentId, setParentId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) {
      toast.error("Select a file");
      return;
    }
    setBusy(true);
    const path = `${companyId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("company-documents").upload(path, file);
    if (upErr) {
      toast.error(upErr.message);
      setBusy(false);
      return;
    }
    const parent = parentId ? existingHeads.find((h) => h.id === parentId) : null;
    const nextVersion = parent ? await getNextVersion(parent.id) : 1;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("company_documents").insert({
      company_id: companyId,
      kind: kind as "attachment",
      name: name.trim() || file.name,
      storage_path: path,
      mime: file.type,
      size_bytes: file.size,
      version: nextVersion,
      parent_id: parent?.id ?? null,
      uploaded_by: u.user?.id ?? null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Uploaded");
      onDone();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-1.5">
            <Label>Name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={file?.name}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {[
                  "estimate",
                  "invoice",
                  "bill_of_lading",
                  "contract",
                  "insurance",
                  "license",
                  "photo",
                  "attachment",
                  "other",
                ].map((k) => (
                  <option key={k} value={k}>
                    {k.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>New version of (optional)</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">— New document —</option>
                {existingHeads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void upload()} disabled={busy}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function getNextVersion(parentId: string) {
  const { data } = await supabase
    .from("company_documents")
    .select("version")
    .or(`id.eq.${parentId},parent_id.eq.${parentId}`);
  const max = ((data as Array<{ version: number }> | null) ?? []).reduce(
    (m, r) => Math.max(m, Number(r.version)),
    0,
  );
  return max + 1;
}
