import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, Mail, Phone } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  message: z.string().trim().min(1, "Message is required").max(1000),
});

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Easy Moving" },
      {
        name: "description",
        content:
          "Talk to our moving specialists. We reply within 30 minutes during business hours.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [state, setState] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = contactSchema.safeParse(state);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your input");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setState({ name: "", email: "", message: "" });
    toast.success("Message received. We'll reply within 30 minutes.");
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
              Contact
            </span>
            <h1 className="mt-3 font-serif text-5xl font-medium">Say hello.</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Ready to talk about your move? Our specialists reply within 30 minutes during business
              hours.
            </p>
            <div className="mt-10 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" /> hello@easymoving.example
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary" /> 1-800-EASY-MOV
              </div>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-card p-6 space-y-4"
          >
            <div>
              <Label>Name</Label>
              <Input
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
                maxLength={100}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={state.email}
                onChange={(e) => setState({ ...state, email: e.target.value })}
                maxLength={255}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={state.message}
                onChange={(e) => setState({ ...state, message: e.target.value })}
                rows={5}
                maxLength={1000}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send message
            </Button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
