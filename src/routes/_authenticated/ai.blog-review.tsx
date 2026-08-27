import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell } from "@/components/shell/Chrome";
import { EmptyState } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  saveBlogDraft,
  approveBlogDraft,
  publishBlogDraft,
  unpublishBlogDraft,
} from "@/lib/blog-publish.functions";

export const Route = createFileRoute("/_authenticated/ai/blog-review")({
  head: () => ({
    meta: [
      { title: "Blog Review Queue — AI Blog Agent | Easy Moving" },
      {
        name: "description",
        content:
          "Human review queue for AI-drafted blog articles: edit, approve and publish moving guides before they go live.",
      },
    ],
  }),
  component: BlogReviewPage,
});

const STATUSES = ["draft", "approved", "published", "archived"] as const;
type StatusFilter = (typeof STATUSES)[number];

type Row = {
  id: string;
  kind: string;
  agent_key: string | null;
  title: string;
  slug: string | null;
  summary: string | null;
  body: string | null;
  seo: Record<string, unknown> | null;
  status: string;
  quality_score: number | null;
  created_at: string;
  published_at: string | null;
};

const words = (s: string | null) => (s ? s.trim().split(/\s+/).filter(Boolean).length : 0);
const seoStr = (row: Row, key: string) => {
  const v = (row.seo ?? {})[key];
  return typeof v === "string" ? v : "";
};

function BlogReviewPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("draft");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    body: "",
    seoTitle: "",
    seoDescription: "",
  });
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  // CRITICAL FILTER: only kind='blog_article' (kind='blog' is the ~28.8k city
  // SEO corpus and must never appear in this queue).
  const list = useQuery({
    queryKey: ["blog-review", status],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("ai_content_items")
        .select(
          "id, kind, agent_key, title, slug, summary, body, seo, status, quality_score, created_at, published_at",
        )
        .eq("kind", "blog_article")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = list.data ?? [];
  const current = rows.find((r) => r.id === openId) ?? null;

  useEffect(() => {
    if (!current) return;
    setForm({
      title: current.title ?? "",
      slug: current.slug ?? "",
      summary: current.summary ?? "",
      body: current.body ?? "",
      seoTitle: seoStr(current, "title"),
      seoDescription: seoStr(current, "description"),
    });
    setPublishedUrl(null);
  }, [current?.id]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["blog-review"] });

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      const r = (await fn()) as { url?: string } | undefined;
      if (r && typeof r.url === "string") setPublishedUrl(r.url);
      toast.success(ok);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AiShell>
      <PageHeader
        title="Blog Review Queue"
        description="Human review of AI Blog Agent drafts. Nothing is published without explicit approval."
        icon={FileText}
      />

      <SectionShell title="Queue" description="Newest first — AI blog articles only.">
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => {
                setStatus(s);
                setOpenId(null);
              }}
            >
              {s}
            </Button>
          ))}
          <span className="ml-auto self-center text-sm text-muted-foreground">
            {list.isLoading ? "Loading…" : `${rows.length} article${rows.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {list.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No articles" description={`No blog drafts with status "${status}".`} />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className={`w-full rounded-xl border p-4 text-left transition hover:border-primary/50 ${
                  openId === r.id ? "border-primary bg-muted/40" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.title}</span>
                  <Badge variant="outline">{r.status}</Badge>
                  {r.agent_key && <Badge variant="secondary">{r.agent_key}</Badge>}
                  {r.quality_score != null && (
                    <Badge variant="outline">score {r.quality_score}</Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  /blog/{r.slug ?? "—"} · {words(r.body)} words ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </div>
                {r.summary && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </SectionShell>

      {current && (
        <SectionShell
          title="Review & edit"
          description={`Status: ${current.status}${
            current.published_at
              ? ` · published ${new Date(current.published_at).toLocaleString()}`
              : ""
          }`}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </Field>
              <Field label="Summary">
                <Textarea
                  rows={3}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </Field>
              <Field label="SEO title">
                <Input
                  value={form.seoTitle}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                />
              </Field>
              <Field label="SEO description">
                <Textarea
                  rows={3}
                  value={form.seoDescription}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                />
              </Field>
              <Field label={`Body (Markdown) — ${words(form.body)} words`}>
                <Textarea
                  rows={22}
                  className="font-mono text-xs"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <div className="text-sm font-medium">Markdown preview</div>
              <div className="mt-3 max-h-[720px] overflow-auto rounded-xl border border-border p-5">
                <h1 className="font-serif text-3xl font-medium leading-tight">{form.title}</h1>
                <div className="prose prose-neutral mt-4 max-w-none text-foreground">
                  <BlogMarkdown>{form.body}</BlogMarkdown>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button
              disabled={busy !== null}
              onClick={() =>
                run(
                  "save",
                  () =>
                    saveBlogDraft({
                      data: {
                        contentItemId: current.id,
                        title: form.title,
                        slug: form.slug,
                        summary: form.summary,
                        body: form.body,
                        seoTitle: form.seoTitle,
                        seoDescription: form.seoDescription,
                      },
                    }),
                  "Draft saved",
                )
              }
            >
              {busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                run(
                  "approve",
                  () => approveBlogDraft({ data: { contentItemId: current.id } }),
                  "Draft approved",
                )
              }
            >
              {busy === "approve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
            <Button variant="default" disabled={busy !== null} onClick={() => setConfirm(true)}>
              Approve &amp; Publish
            </Button>
            {current.status === "published" && (
              <Button
                variant="destructive"
                disabled={busy !== null}
                onClick={() =>
                  run(
                    "unpublish",
                    () => unpublishBlogDraft({ data: { contentItemId: current.id } }),
                    "Article unpublished — back to draft",
                  )
                }
              >
                {busy === "unpublish" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Unpublish
              </Button>
            )}
            {publishedUrl && (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"
              >
                Open Live Article <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <AlertDialog open={confirm} onOpenChange={setConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish this article?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Title:</strong> {current.title}
                    </div>
                    <div>
                      <strong>URL:</strong> /blog/{current.slug ?? "—"}
                    </div>
                    <div>This will make the article public.</div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setConfirm(false);
                    await run(
                      "publish",
                      async () => {
                        await approveBlogDraft({ data: { contentItemId: current.id } });
                        return publishBlogDraft({ data: { contentItemId: current.id } });
                      },
                      "Article published",
                    );
                  }}
                >
                  Approve &amp; Publish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SectionShell>
      )}
    </AiShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
