import { useEffect, useState } from "react";
import { MapPin, Tag, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n";
import { Section, Row, Empty, money, type LeadQuote } from "./shared";
import { LeadMap } from "./LeadMap";

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const SOURCES = ["website", "calculator", "phone", "referral", "partner", "ads", "other"] as const;
const SERVICE_TYPES = [
  "local",
  "long_distance",
  "interstate",
  "packing_only",
  "storage",
  "labor_only",
] as const;
const LANGUAGES = ["English", "Spanish", "Russian", "Chinese", "French", "Other"] as const;

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-700 border-neutral-300",
  normal: "bg-blue-100 text-blue-800 border-blue-300",
  high: "bg-amber-100 text-amber-800 border-amber-300",
  urgent: "bg-rose-100 text-rose-800 border-rose-300",
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

async function patchQuote(id: string, patch: Record<string, unknown>, okMessage: string) {
  const { error } = await supabase
    .from("quotes")
    .update(patch as never)
    .eq("id", id);
  if (error) toast.error(error.message);
  else toast.success(okMessage);
}

export function OverviewSection({
  q,
  brokerSlot,
  workflowSlot,
}: {
  q: LeadQuote;
  brokerSlot?: React.ReactNode;
  workflowSlot?: React.ReactNode;
}) {
  const tr = useT();
  const details = (q.details as Record<string, unknown> | null) ?? {};
  const [priority, setPriority] = useState(String(q.priority ?? "normal"));
  const [source, setSource] = useState(str(q.source) ?? "");
  const [serviceType, setServiceType] = useState(str(q.service_type) ?? str(q.move_type) ?? "");
  const [language, setLanguage] = useState(str(q.customer_language) ?? "");
  const [tags, setTags] = useState<string[]>(Array.isArray(q.tags) ? (q.tags as string[]) : []);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setPriority(String(q.priority ?? "normal"));
    setSource(str(q.source) ?? "");
    setServiceType(str(q.service_type) ?? str(q.move_type) ?? "");
    setLanguage(str(q.customer_language) ?? "");
    setTags(Array.isArray(q.tags) ? (q.tags as string[]) : []);
  }, [q.id]);

  async function saveTags(next: string[]) {
    setTags(next);
    await patchQuote(q.id, { tags: next }, tr("admin.shell.leadOverview.leadUpdated"));
  }

  const originPt =
    q.origin_lat && q.origin_lng
      ? { lat: Number(q.origin_lat), lng: Number(q.origin_lng) }
      : null;
  const destPt =
    q.destination_lat && q.destination_lng
      ? { lat: Number(q.destination_lat), lng: Number(q.destination_lng) }
      : null;

  const priorityOptionLabel = (v: string) => tr(`admin.shell.leadOverview.priority.${v}`);
  const sourceOptionLabel = (v: string) => tr(`admin.shell.leadOverview.source.${v}`);
  const serviceTypeOptionLabel = (v: string) => tr(`admin.shell.leadOverview.serviceType.${v}`);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Section title={tr("admin.shell.leadOverview.overview")}>
          <Row label={tr("admin.shell.leadOverview.leadId")} value={q.quote_number ?? q.id.slice(0, 8)} />
          <Row label={tr("admin.shell.leadOverview.status")} value={q.status} />
          <Row label={tr("admin.shell.leadOverview.workflowStage")} value={q.lead_status ?? q.job_status} />
          <Row label={tr("admin.shell.leadOverview.leadPhase")} value={q.lead_phase} />
          <Row
            label={tr("admin.shell.leadOverview.estimate")}
            value={`${money(q.estimated_low)} – ${money(q.estimated_high)}`}
          />
          <Row label={tr("admin.shell.leadOverview.moveDate")} value={q.move_date} />
          <Row label={tr("admin.shell.leadOverview.created")} value={new Date(String(q.created_at)).toLocaleString()} />
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{tr("admin.shell.leadOverview.assignedBroker")}</span>
              <div className="w-[180px]">{brokerSlot}</div>
            </div>
            <LabeledSelect
              label={tr("admin.shell.leadOverview.priorityLabel")}
              value={priority}
              options={PRIORITIES as unknown as string[]}
              optionLabel={priorityOptionLabel}
              onChange={(v) => {
                setPriority(v);
                void patchQuote(q.id, { priority: v }, tr("admin.shell.leadOverview.leadUpdated"));
              }}
            />
            <LabeledSelect
              label={tr("admin.shell.leadOverview.sourceLabel")}
              value={source}
              options={SOURCES as unknown as string[]}
              optionLabel={sourceOptionLabel}
              onChange={(v) => {
                setSource(v);
                void patchQuote(q.id, { source: v }, tr("admin.shell.leadOverview.leadUpdated"));
              }}
            />
            <LabeledSelect
              label={tr("admin.shell.leadOverview.serviceTypeLabel")}
              value={serviceType}
              options={SERVICE_TYPES as unknown as string[]}
              optionLabel={serviceTypeOptionLabel}
              onChange={(v) => {
                setServiceType(v);
                void patchQuote(q.id, { service_type: v }, tr("admin.shell.leadOverview.leadUpdated"));
              }}
            />
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className={`capitalize ${PRIORITY_STYLE[priority] ?? ""}`}>
                {tr("admin.shell.leadOverview.priorityBadge", { priority: priorityOptionLabel(priority) })}
              </Badge>
            </div>
          </div>
        </Section>

        <Section
          title={
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3 w-3" /> {tr("admin.shell.leadOverview.internalTags")}
            </span>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
              >
                {t}
                <button
                  type="button"
                  aria-label={tr("admin.shell.leadOverview.removeTag", { tag: t })}
                  onClick={() => void saveTags(tags.filter((x) => x !== t))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {tags.length === 0 && (
              <span className="text-sm text-muted-foreground">{tr("admin.shell.leadOverview.noTags")}</span>
            )}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = tagDraft.trim();
              if (!v || tags.includes(v)) return;
              setTagDraft("");
              void saveTags([...tags, v]);
            }}
          >
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder={tr("admin.shell.leadOverview.addTagPlaceholder")}
              className="h-8"
            />
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-accent"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {tr("admin.shell.leadOverview.add")}
            </button>
          </form>
          {workflowSlot && <div className="mt-4 border-t border-border pt-3">{workflowSlot}</div>}
        </Section>

        <Section title={tr("admin.shell.leadOverview.customerProfile")}>
          <Row label={tr("admin.shell.leadOverview.name")} value={(details as { fullName?: string }).fullName} />
          <Row label={tr("admin.shell.leadOverview.email")} value={q.contact_email} />
          <Row label={tr("admin.shell.leadOverview.phone")} value={q.contact_phone} />
          <Row
            label={tr("admin.shell.leadOverview.preferredContact")}
            value={(details as { contactMethod?: string }).contactMethod}
          />
          <Row
            label={tr("admin.shell.leadOverview.bestTimeToCall")}
            value={(details as { contactTime?: string }).contactTime}
          />
          <LabeledSelect
            label={tr("admin.shell.leadOverview.languageLabel")}
            value={language}
            options={LANGUAGES as unknown as string[]}
            onChange={(v) => {
              setLanguage(v);
              void patchQuote(q.id, { customer_language: v }, tr("admin.shell.leadOverview.leadUpdated"));
            }}
          />
          <Row label={tr("admin.shell.leadOverview.customerNotes")} value={q.inventory_notes} />
        </Section>

        <Section title={tr("admin.shell.leadOverview.moveSummary")}>
          <Row label={tr("admin.shell.leadOverview.type")} value={q.move_type} />
          <Row label={tr("admin.shell.leadOverview.distance")} value={q.distance_miles ? tr("admin.shell.leadOverview.milesValue", { miles: q.distance_miles }) : null} />
          <Row label={tr("admin.shell.leadOverview.preferredTime")} value={q.preferred_time} />
          <Row label={tr("admin.shell.leadOverview.flexibleDate")} value={q.flexible_date} />
          <Row label={tr("admin.shell.leadOverview.insurance")} value={q.insurance_tier} />
          <Row label={tr("admin.shell.leadOverview.truck")} value={q.truck_size} />
          <Row label={tr("admin.shell.leadOverview.crew")} value={q.num_movers ? tr("admin.shell.leadOverview.moversValue", { count: q.num_movers }) : null} />
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AddressCard
          title={tr("admin.shell.leadOverview.origin")}
          address={q.origin_address ?? `${q.origin_city ?? ""} ${q.origin_zip ?? ""}`}
          city={q.origin_city}
          state={q.origin_state}
          zip={q.origin_zip}
          buildingType={q.pickup_property_type ?? q.property_type}
          floor={q.pickup_floor ?? q.origin_stairs}
          stairs={q.origin_stairs}
          elevator={q.pickup_elevator ?? q.origin_elevator}
          parking={q.pickup_parking_distance}
          carry={q.pickup_carry_distance}
          longCarry={q.origin_long_carry}
          notes={q.pickup_notes}
        />
        <AddressCard
          title={tr("admin.shell.leadOverview.destination")}
          address={q.destination_address ?? `${q.destination_city ?? ""} ${q.destination_zip ?? ""}`}
          city={q.destination_city}
          state={q.destination_state}
          zip={q.destination_zip}
          buildingType={q.delivery_property_type}
          floor={q.delivery_floor ?? q.destination_stairs}
          stairs={q.destination_stairs}
          elevator={q.delivery_elevator ?? q.destination_elevator}
          parking={q.delivery_parking_distance}
          carry={q.delivery_carry_distance}
          longCarry={q.destination_long_carry}
          notes={q.delivery_notes}
        />
      </div>

      <Section title={tr("admin.shell.leadOverview.route")}>
        {originPt || destPt ? (
          <LeadMap
            origin={originPt}
            destination={destPt}
            originLabel={String(q.origin_address ?? q.origin_city ?? tr("admin.shell.leadOverview.origin"))}
            destinationLabel={String(q.destination_address ?? q.destination_city ?? tr("admin.shell.leadOverview.destination"))}
          />
        ) : (
          <Empty>{tr("admin.shell.leadOverview.noGeocodedAddresses")}</Empty>
        )}
      </Section>
    </div>
  );
}

function AddressCard(props: {
  title: string;
  address: unknown;
  city: unknown;
  state: unknown;
  zip: unknown;
  buildingType: unknown;
  floor: unknown;
  stairs: unknown;
  elevator: unknown;
  parking: unknown;
  carry: unknown;
  longCarry: unknown;
  notes: unknown;
}) {
  const tr = useT();
  return (
    <Section
      title={
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {props.title}
        </span>
      }
    >
      <Row label={tr("admin.shell.leadOverview.fullAddress")} value={props.address} />
      <Row label={tr("admin.shell.leadOverview.cityState")} value={[props.city, props.state].filter(Boolean).join(", ")} />
      <Row label={tr("admin.shell.leadOverview.zip")} value={props.zip} />
      <Row label={tr("admin.shell.leadOverview.buildingType")} value={props.buildingType} />
      <Row label={tr("admin.shell.leadOverview.floor")} value={props.floor} />
      <Row label={tr("admin.shell.leadOverview.stairsFlights")} value={props.stairs} />
      <Row label={tr("admin.shell.leadOverview.elevator")} value={props.elevator} />
      <Row label={tr("admin.shell.leadOverview.parking")} value={props.parking} />
      <Row
        label={tr("admin.shell.leadOverview.walkingDistance")}
        value={props.longCarry ? tr("admin.shell.leadOverview.longCarry") : (props.carry ?? null)}
      />
      <Row label={tr("admin.shell.leadOverview.notes")} value={props.notes} />
    </Section>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  optionLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  optionLabel?: (v: string) => string;
  onChange: (v: string) => void;
}) {
  const tr = useT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[180px] capitalize">
          <SelectValue placeholder={tr("admin.shell.leadOverview.notSet")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="capitalize">
              {optionLabel ? optionLabel(o) : o.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
