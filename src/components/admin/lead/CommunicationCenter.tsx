import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MessageSquare, Mail } from "lucide-react";
import { Empty, dateTime, type LeadQuote } from "./shared";
import { useT } from "@/i18n";

export type Channel = "call" | "sms" | "email";

export type Communication = {
  id: string;
  channel: Channel;
  direction: string;
  status: string;
  subject: string | null;
  body: string | null;
  duration_seconds: number | null;
  occurred_at: string;
  actor_email: string | null;
};

const STATUSES: Record<Channel, string[]> = {
  call: ["connected", "no_answer", "voicemail", "busy", "wrong_number"],
  sms: ["sent", "delivered", "replied", "failed"],
  email: ["sent", "opened", "replied", "bounced"],
};

export async function logCommunication(
  quoteId: string,
  input: {
    channel: Channel;
    direction?: string;
    status?: string;
    subject?: string | null;
    body?: string | null;
    duration_seconds?: number | null;
  },
) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("lead_communications").insert({
    quote_id: quoteId,
    channel: input.channel,
    direction: input.direction ?? "outbound",
    status: input.status ?? "logged",
    subject: input.subject ?? null,
    body: input.body ?? null,
    duration_seconds: input.duration_seconds ?? null,
    actor_id: u.user?.id ?? null,
    actor_email: u.user?.email ?? null,
  } as never);
  if (error) throw new Error(error.message);
}

export function useCommunications(quoteId: string) {
  const [items, setItems] = useState<Communication[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("lead_communications")
      .select("*")
      .eq("quote_id", quoteId)
      .order("occurred_at", { ascending: false });
    setItems((data as unknown as Communication[]) ?? []);
  }, [quoteId]);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`lead-comms-${quoteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_communications",
          filter: `quote_id=eq.${quoteId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [quoteId, load]);

  return { items, reload: load };
}

export function CommunicationCenter({ q }: { q: LeadQuote }) {
  const tr = useT();
  const { items } = useCommunications(q.id);

  return (
    <Tabs defaultValue="call" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="call">
          <Phone className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
          {tr("admin.shell.comms.tabCalls")}
        </TabsTrigger>
        <TabsTrigger value="sms">
          <MessageSquare className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
          {tr("admin.shell.comms.tabSms")}
        </TabsTrigger>
        <TabsTrigger value="email">
          <Mail className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
          {tr("admin.shell.comms.tabEmails")}
        </TabsTrigger>
      </TabsList>
      {(["call", "sms", "email"] as Channel[]).map((c) => (
        <TabsContent key={c} value={c} className="space-y-3 pt-4">
          <Composer quoteId={q.id} channel={c} lead={q} />
          <ActivityList items={items.filter((i) => i.channel === c)} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function statusLabel(tr: (k: string, v?: Record<string, unknown>) => string, s: string): string {
  return tr(`admin.shell.comms.status.${s}`);
}

function Composer({
  quoteId,
  channel,
  lead,
}: {
  quoteId: string;
  channel: Channel;
  lead: LeadQuote;
}) {
  const tr = useT();
  const [status, setStatus] = useState(STATUSES[channel][0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);

  const phone = (lead.contact_phone as string) ?? "";
  const email = (lead.contact_email as string) ?? "";

  async function submit() {
    setSaving(true);
    try {
      await logCommunication(quoteId, {
        channel,
        status,
        subject: channel === "email" ? subject || null : null,
        body: body || null,
        duration_seconds: channel === "call" && duration ? Number(duration) * 60 : null,
      });
      setBody("");
      setSubject("");
      setDuration("");
      toast.success(tr("admin.shell.comms.logged"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.shell.comms.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES[channel].map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(tr, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {channel === "call" && (
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            inputMode="numeric"
            placeholder={tr("admin.shell.comms.minutes")}
            className="h-8 w-[110px]"
          />
        )}
        {channel === "call" && phone && (
          <Button asChild size="sm" variant="outline" className="h-8">
            <a href={`tel:${phone}`}>{tr("admin.shell.comms.dial")}</a>
          </Button>
        )}
        {channel === "sms" && phone && (
          <Button asChild size="sm" variant="outline" className="h-8">
            <a href={`sms:${phone}`}>{tr("admin.shell.comms.openSms")}</a>
          </Button>
        )}
        {channel === "email" && email && (
          <Button asChild size="sm" variant="outline" className="h-8">
            <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>
              {tr("admin.shell.comms.openEmail")}
            </a>
          </Button>
        )}
      </div>
      {channel === "email" && (
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={tr("admin.shell.comms.subject")}
          className="h-8"
        />
      )}
      <Textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          channel === "call" ? tr("admin.shell.comms.callNotes") : tr("admin.shell.comms.messageNotes")
        }
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void submit()} disabled={saving}>
          {saving ? tr("admin.shell.comms.saving") : tr("admin.shell.comms.logActivity")}
        </Button>
      </div>
    </div>
  );
}

function ActivityList({ items }: { items: Communication[] }) {
  const tr = useT();
  if (items.length === 0) return <Empty>{tr("admin.shell.comms.noActivity")}</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id} className="rounded-lg border border-border bg-background p-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>{dateTime(i.occurred_at)}</span>
            <span>{i.actor_email ?? tr("admin.shell.comms.system")}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium">
              {tr(`admin.shell.comms.direction.${i.direction}`)} · {statusLabel(tr, i.status)}
            </span>
            {i.duration_seconds ? (
              <span className="text-xs text-muted-foreground">
                {tr("admin.shell.comms.minutesValue", { count: Math.round(i.duration_seconds / 60) })}
              </span>
            ) : null}
          </div>
          {i.subject && <div className="mt-1 font-medium">{i.subject}</div>}
          {i.body && <p className="mt-1 whitespace-pre-wrap">{i.body}</p>}
        </li>
      ))}
    </ul>
  );
}
