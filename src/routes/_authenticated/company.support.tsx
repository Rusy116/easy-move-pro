import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, Mail, Phone, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/support")({
  head: () => ({ meta: [{ title: "Support — Company Portal" }] }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Carrier support
          </p>
          <h1 className="font-serif text-3xl font-medium">We're here to help</h1>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card
          icon={<Mail className="h-4 w-4" />}
          title="Email our partner team"
          body="partners@easymove.pro — replies within one business day."
        />
        <Card
          icon={<Phone className="h-4 w-4" />}
          title="Call us"
          body="(888) 555-0142, Monday to Friday, 8am–6pm ET."
        />
        <Card
          icon={<BookOpen className="h-4 w-4" />}
          title="Approval status"
          body="Applications are typically reviewed within 1–3 business days after your license and insurance documents are uploaded."
        />
        <Card
          icon={<LifeBuoy className="h-4 w-4" />}
          title="Rejected application?"
          body="Update your company profile and documents, then email our partner team to request a new review."
        />
      </div>
    </section>
  );
}

function Card({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <h2 className="mt-2 font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
