import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Newspaper, Building2, Package, Image as ImageIcon, DollarSign } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ECOSYSTEM_AGENTS, PRODUCTION_PIPELINE } from "@/lib/ai/ecosystem";
import {
  ecosystemStatus,
  runBlogAgent,
  runGrowthAgent,
  runProductAgent,
  runImageAgent,
  runRevenueAgent,
} from "@/lib/ai-ecosystem.functions";

export const Route = createFileRoute("/_authenticated/ai/ecosystem")({
  head: () => ({
    meta: [
      { title: "AI Ecosystem — 12 Coordinated Agents | Easy Moving" },
      {
        name: "description",
        content:
          "Control the Easy Moving AI ecosystem: data, calculator factory, SEO, linking, blog, growth, products, images, optimization, performance and revenue agents.",
      },
    ],
  }),
  component: EcosystemPage,
});

function EcosystemPage() {
  const qc = useQueryClient();
  const [log, setLog] = useState<{ t: string; msg: string }[]>([]);
  const [blogCount, setBlogCount] = useState<number>(1);
  const push = (msg: string) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), msg }, ...l].slice(0, 40));

  const status = useQuery({
    queryKey: ["ai-ecosystem-status"],
    queryFn: () => ecosystemStatus({ data: {} as never }),
    refetchInterval: 30000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["ai-ecosystem-status"] });

  const blog = useMutation({
    mutationFn: () => runBlogAgent({ data: { count: 3 } }),
    onSuccess: (r) => {
      push(`Blog Agent — ${r.created} articles drafted (${r.aiGenerated} AI-written).`);
      toast.success(`Drafted ${r.created} customer articles`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const growth = useMutation({
    mutationFn: () => runGrowthAgent({ data: { count: 3 } }),
    onSuccess: (r) => {
      push(`Growth Agent — ${r.created} mover articles drafted (${r.aiGenerated} AI-written).`);
      toast.success(`Drafted ${r.created} mover articles`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const product = useMutation({
    mutationFn: () => runProductAgent({ data: { count: 2 } }),
    onSuccess: (r) => {
      push(`Product Agent — ${r.created} products created: ${r.titles.join(", ") || "none pending"}.`);
      toast.success(`Created ${r.created} products`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const image = useMutation({
    mutationFn: () => runImageAgent({ data: { limit: 40 } }),
    onSuccess: (r) => {
      push(`Image Agent — ${r.contentBriefed} article image sets, ${r.productsBriefed} product covers briefed.`);
      toast.success("Image briefs generated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revenue = useMutation({
    mutationFn: () => runRevenueAgent({ data: {} as never }),
    onSuccess: (r) => {
      push(
        `Revenue Agent — platform $${r.platformRevenue.toLocaleString()}, broker $${r.brokerRevenue.toLocaleString()}, products $${r.productRevenue.toLocaleString()}, pipeline $${r.pipeline.toLocaleString()}.`,
      );
      toast.success("Revenue rollup complete");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy =
    blog.isPending || growth.isPending || product.isPending || image.isPending || revenue.isPending;
  const t = status.data?.totals;
  const agentStatus = new Map((status.data?.agents ?? []).map((a) => [a.key, a]));

  return (
    <AiShell>
      <PageHeader
        title="AI Ecosystem"
        subtitle="12 specialized agents coordinated by the Orchestrator. Calculator-first, always."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cities in database" value={String(t?.cities ?? "—")} />
        <StatCard label="Calculators published" value={String(t?.calcPublished ?? "—")} />
        <StatCard label="SEO pages published" value={String(t?.seoPublished ?? "—")} />
        <StatCard label="Digital products" value={String(t?.products ?? "—")} />
        <StatCard label="Content drafts" value={String(t?.contentDrafts ?? "—")} />
        <StatCard label="Content published" value={String(t?.contentPublished ?? "—")} />
        <StatCard label="Tasks queued" value={String(t?.queued ?? "—")} />
        <StatCard label="Tasks failed" value={String(t?.failed ?? "—")} />
      </div>

      <SectionShell title="Production pipeline">
        <ol className="flex flex-wrap gap-2 text-xs">
          {PRODUCTION_PIPELINE.map((step, i) => (
            <li
              key={step}
              className={`rounded-full border px-3 py-1 ${
                i === 2 || i === 3
                  ? "border-primary/40 bg-primary/10 font-semibold text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {i + 1}. {step}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          The calculator step never moves. SEO pages are only generated after a city's calculator is
          published and validated.
        </p>
      </SectionShell>

      <SectionShell title="Run agents">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Button onClick={() => blog.mutate()} disabled={busy} className="justify-start gap-2">
            {blog.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />}
            Blog Agent
          </Button>
          <Button onClick={() => growth.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {growth.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
            Growth Agent
          </Button>
          <Button onClick={() => product.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {product.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            Product Agent
          </Button>
          <Button onClick={() => image.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {image.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Image Agent
          </Button>
          <Button onClick={() => revenue.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {revenue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Revenue Agent
          </Button>
        </div>
      </SectionShell>

      <SectionShell title="The 12 agents">
        <div className="grid gap-3 lg:grid-cols-2">
          {ECOSYSTEM_AGENTS.map((a) => {
            const s = agentStatus.get(a.key);
            return (
              <div key={a.key} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Agent {a.index}
                    </p>
                    <h3 className="mt-1 font-semibold">{a.name}</h3>
                  </div>
                  <Badge variant={s?.status === "running" ? "default" : "secondary"}>
                    {s?.status ?? "not_registered"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{a.purpose}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.capabilities.map((c) => (
                    <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    queue <b>{a.queue}</b> · priority <b>{a.priority}</b>
                    {a.dependsOn.length > 0 && <> · after {a.dependsOn.join(", ")}</>}
                  </span>
                  <Link to={a.route as "/"} className="text-primary underline">
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell title="Run log">
        {log.length === 0 ? (
          <EmptyState title="No runs yet" hint="Run the Blog or Product agent to create new drafts in the Publishing Center." />
        ) : (
          <ul className="space-y-2 text-sm">
            {log.map((l, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-border px-3 py-2">
                <span className="shrink-0 text-xs text-muted-foreground">{l.t}</span>
                <span>{l.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>
    </AiShell>
  );
}
