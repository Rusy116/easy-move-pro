import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Search, Plus, Send, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/messages")({
  head: () => ({ meta: [{ title: "Messages — Company Portal" }] }),
  component: MessagesPage,
});

type Conversation = {
  id: string;
  company_id: string;
  kind: "broker" | "internal";
  subject: string;
  quote_id: string | null;
  last_message_at: string;
  created_at: string;
};
type Message = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: string;
  sender_name: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};

function MessagesPage() {
  const { loading, company, reload } = useMoverPortal();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newKind, setNewKind] = useState<"broker" | "internal">("internal");
  const [newBody, setNewBody] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    if (!company) return;
    const { data } = await supabase
      .from("company_conversations")
      .select("*")
      .eq("company_id", company.id)
      .order("last_message_at", { ascending: false });
    setConvs((data as Conversation[] | null) ?? []);
  }, [company]);

  const loadMsgs = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("company_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at");
    setMsgs((data as Message[] | null) ?? []);
    void supabase
      .from("company_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .is("read_at", null);
  }, []);

  useEffect(() => {
    void loadConvs();
  }, [loadConvs]);
  useEffect(() => {
    if (activeId) void loadMsgs(activeId);
  }, [activeId, loadMsgs]);

  useEffect(() => {
    if (!company) return;
    const ch = supabase
      .channel(`co-msgs-${company.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_messages",
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          void loadConvs();
          if (activeId) void loadMsgs(activeId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_conversations",
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          void loadConvs();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [company, activeId, loadConvs, loadMsgs]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const filtered = useMemo(() => {
    if (!q.trim()) return convs;
    const n = q.toLowerCase();
    return convs.filter((c) => c.subject.toLowerCase().includes(n));
  }, [convs, q]);

  const active = convs.find((c) => c.id === activeId) ?? null;

  async function send() {
    if (!company || !active || !draft.trim()) return;
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("company_messages").insert({
      conversation_id: active.id,
      company_id: company.id,
      sender_user_id: u.user?.id ?? null,
      sender_role: active.kind === "broker" ? "mover" : "mover",
      sender_name: u.user?.email ?? "You",
      body: draft.trim(),
    });
    setSending(false);
    if (error) toast.error(error.message);
    else setDraft("");
  }

  async function createConversation() {
    if (!company || !newSubject.trim() || !newBody.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { data: conv, error } = await supabase
      .from("company_conversations")
      .insert({
        company_id: company.id,
        kind: newKind,
        subject: newSubject.trim(),
        created_by: u.user?.id ?? null,
      })
      .select()
      .single();
    if (error || !conv) {
      toast.error(error?.message ?? "Failed");
      return;
    }
    await supabase.from("company_messages").insert({
      conversation_id: conv.id,
      company_id: company.id,
      sender_user_id: u.user?.id ?? null,
      sender_role: "mover",
      sender_name: u.user?.email ?? "You",
      body: newBody.trim(),
    });
    toast.success("Conversation started");
    setOpen(false);
    setNewSubject("");
    setNewBody("");
    await loadConvs();
    setActiveId(conv.id);
  }

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] h-[calc(100vh-260px)] min-h-[520px]">
        <div className="card-premium p-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 px-1">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-lg">Inbox</h2>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(["broker", "internal"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setNewKind(k)}
                        className={`rounded-lg border p-3 text-left ${newKind === k ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium capitalize">
                          {k === "broker" ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                          {k}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {k === "broker" ? "To Easy Moving broker" : "Team members only"}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject</Label>
                    <Input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. Question about lead EM-2026-000123"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Message</Label>
                    <Textarea
                      rows={5}
                      value={newBody}
                      onChange={(e) => setNewBody(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => void createConversation()}>Start</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No conversations.</div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${activeId === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{c.subject}</span>
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {c.kind}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(c.last_message_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card-premium p-4 flex flex-col min-h-0">
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
              Select a conversation, or start a new one.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
                <div>
                  <div className="font-serif text-xl">{active.subject}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {active.kind} conversation
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {active.kind}
                </Badge>
              </div>

              <div ref={scrollerRef} className="flex-1 overflow-y-auto py-4 space-y-3">
                {msgs.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{m.sender_name ?? m.sender_role}</span>
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                  </div>
                ))}
                {msgs.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground">No messages yet.</div>
                )}
              </div>

              <div className="border-t border-border pt-3 flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  rows={2}
                  className="resize-none"
                />
                <Button onClick={() => void send()} disabled={sending || !draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
