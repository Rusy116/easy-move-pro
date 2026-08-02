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
  const { items } = useCommunications(q.id);

  return (
    <Tabs defaultValue="call" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="call">
          <Phone className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
          Calls
        </TabsTrigger>
        <TabsTrigger value="sms">
          <MessageSquare className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
          SMS
        </TabsTrigger>
        <TabsTrigger value="email">
          <Mail className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
          Emails
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

function Composer({
  quoteId,
  channel,
  lead,
}: {
  quoteId: string;
  channel: Channel;
  lead: LeadQuote;
}) {
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
      toast.success("Activity logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-[160px] capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES[channel].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {channel === "call" && (
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            inputMode="numeric"
            placeholder="Minutes"
            className="h-8 w-[110px]"
          />
        )}
        {channel === "call" && phone && (
          <Button asChild size="sm" variant="outline" className="h-8">
            <a href={`tel:${phone}`}>Dial</a>
          </Button>
        )}
        {channel === "sms" && phone && (
          <Button asChild size="sm" variant="outline" className="h-8">
            <a href={`sms:${phone}`}>Open SMS</a>
          </Button>
        )}
        {channel === "email" && email && (
          <Button asChild size="sm" variant="outline" className="h-8">
            <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>Open email</a>
          </Button>
        )}
      </div>
      {channel === "email" && (
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="h-8"
        />
      )}
      <Textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={channel === "call" ? "Call notes…" : "Message / notes…"}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void submit()} disabled={saving}>
          {saving ? "Saving…" : "Log activity"}
        </Button>
      </div>
    </div>
  );
}

function ActivityList({ items }: { items: Communication[] }) {
  if (items.length === 0) return <Empty>No activity logged yet.</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id} className="rounded-lg border border-border bg-background p-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>{dateTime(i.occurred_at)}</span>
            <span>{i.actor_email ?? "system"}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium capitalize">
              {i.direction} · {i.status.replace(/_/g, " ")}
            </span>
            {i.duration_seconds ? (
              <span className="text-xs text-muted-foreground">
                {Math.round(i.duration_seconds / 60)} min
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
