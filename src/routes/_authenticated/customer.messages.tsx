import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import {
  routeLabel,
  useAssignedCompany,
  useCustomerMessages,
  useMyMoves,
} from "@/lib/customer-portal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/customer/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Easy Moving" },
      {
        name: "description",
        content: "Chat directly with your assigned moving company about your move.",
      },
    ],
  }),
  component: CustomerMessagesPage,
});

function CustomerMessagesPage() {
  const { activeMove: move, loading } = useMyMoves();
  const { company } = useAssignedCompany(move?.assigned_company_id);
  const { messages, loading: loadingMsgs, send } = useCustomerMessages(move?.id ?? null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("Customer");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setName(data.user?.email ?? "Customer");
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim() || !move?.assigned_company_id) return;
    setBusy(true);
    try {
      await send(draft, move.assigned_company_id, name);
      setDraft("");
    } catch (e) {
      toast.error("Message not sent", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="Messages"
            title={company?.name ?? "Your moving company"}
            subtitle={move ? routeLabel(move) : undefined}
            icon={<MessageSquare className="h-5 w-5" />}
          />

          <div className="mt-6">
            <SectionShell>
              {loading || loadingMsgs ? (
                <SkeletonRows n={3} />
              ) : !move?.assigned_company_id ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Messaging opens as soon as a moving company is assigned to your move.
                </p>
              ) : (
                <>
                  <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                    {messages.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No messages yet — say hello to your movers.
                      </p>
                    )}
                    {messages.map((m) => {
                      const mine = m.sender_role === "customer";
                      const system = m.sender_role === "system";
                      return (
                        <div
                          key={m.id}
                          className={
                            system
                              ? "mx-auto max-w-md rounded-xl bg-muted/60 p-3 text-center text-xs text-muted-foreground"
                              : mine
                                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-sage/15 p-3"
                                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-border/60 p-3"
                          }
                        >
                          {!system && (
                            <div className="text-[11px] font-medium text-muted-foreground">
                              {mine ? "You" : (m.sender_name ?? company?.name ?? "Mover")}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={endRef} />
                  </div>

                  <div className="mt-4 flex items-end gap-2 border-t border-border/60 pt-4">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      placeholder="Write a message…"
                      className="flex-1"
                    />
                    <Button
                      className="rounded-full"
                      disabled={busy || !draft.trim()}
                      onClick={handleSend}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </SectionShell>
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
