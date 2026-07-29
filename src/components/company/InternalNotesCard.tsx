import { useState } from "react";
import { toast } from "sonner";
import { Loader2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/company-jobs";
import { useCompanyNotes } from "@/lib/company-crm";

/** Internal, company-only notes on a claimed job. */
export function InternalNotesCard({ quoteId, companyId }: { quoteId: string; companyId: string }) {
  const { notes, addNote } = useCompanyNotes(quoteId, companyId);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    const { error } = await addNote(body);
    setSaving(false);
    if (error) return void toast.error(error.message || "Could not save the note.");
    setBody("");
    toast.success("Internal note added.");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-1.5 text-base font-semibold">
        <StickyNote className="h-4 w-4" /> Internal notes
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Visible to your team only — never shown to the customer.</p>

      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Call summary, access instructions, crew reminders…"
        className="mt-3"
      />
      <Button className="mt-3 rounded-full" size="sm" disabled={saving || !body.trim()} onClick={save}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add note
      </Button>

      {notes.length > 0 && (
        <ol className="mt-5 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
