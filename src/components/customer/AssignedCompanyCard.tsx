import type { ReactNode } from "react";
import { BadgeCheck, Mail, Phone, ShieldCheck, Star, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssignedCompany } from "@/lib/customer-portal";

export function AssignedCompanyCard({
  company,
  onMessage,
}: {
  company: AssignedCompany | null;
  onMessage?: () => void;
}) {
  if (!company) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sage-soft text-sage">
          <Truck className="h-5 w-5" />
        </div>
        <p className="mt-3 font-serif text-base">No moving company yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll introduce your mover as soon as your move is claimed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        {company.logo_url ? (
          <img
            src={company.logo_url}
            alt={`${company.name} logo`}
            className="h-14 w-14 rounded-2xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sage to-emerald-700 font-serif text-lg text-white">
            {company.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-serif text-xl font-medium">{company.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {company.rating != null && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <Star className="h-3.5 w-3.5 fill-current" />
                {Number(company.rating).toFixed(1)}
              </span>
            )}
            <Badge variant="outline" className="capitalize">
              <BadgeCheck className="mr-1 h-3 w-3" /> {company.license_status}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="DOT number" value={company.dot_number} />
        <Detail label="MC number" value={company.mc_number} />
        <Detail
          label="Insurance"
          value={
            company.insurance_carrier
              ? `${company.insurance_carrier}${
                  company.insurance_expires ? ` · valid to ${company.insurance_expires}` : ""
                }`
              : null
          }
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
        />
        <Detail
          label="Service area"
          value={
            [company.service_cities?.join(", "), company.service_states?.join(", ")]
              .filter(Boolean)
              .join(" · ") || null
          }
        />
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        {company.phone && (
          <Button asChild variant="secondary" size="sm" className="rounded-full">
            <a href={`tel:${company.phone}`}>
              <Phone className="mr-1.5 h-4 w-4" /> {company.phone}
            </a>
          </Button>
        )}
        {company.email && (
          <Button asChild variant="secondary" size="sm" className="rounded-full">
            <a href={`mailto:${company.email}`}>
              <Mail className="mr-1.5 h-4 w-4" /> Email
            </a>
          </Button>
        )}
        {onMessage && (
          <Button size="sm" className="rounded-full" onClick={onMessage}>
            Send a message
          </Button>
        )}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 inline-flex items-center gap-1.5 text-foreground/90">
        {icon}
        {value || "—"}
      </dd>
    </div>
  );
}
