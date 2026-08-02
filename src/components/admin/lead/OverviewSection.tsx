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

async function patchQuote(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from("quotes")
    .update(patch as never)
    .eq("id", id);
  if (error) toast.error(error.message);
  else toast.success("Lead updated");
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
    await patchQuote(q.id, { tags: next });
  }

  const originPt =
    q.origin_lat && q.origin_lng
      ? { lat: Number(q.origin_lat), lng: Number(q.origin_lng) }
      : null;
  const destPt =
    q.destination_lat && q.destination_lng
      ? { lat: Number(q.destination_lat), lng: Number(q.destination_lng) }
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Overview">
          <Row label="Lead ID" value={q.quote_number ?? q.id.slice(0, 8)} />
          <Row label="Status" value={q.status} />
          <Row label="Workflow stage" value={q.lead_status ?? q.job_status} />
          <Row label="Lead phase" value={q.lead_phase} />
          <Row
            label="Estimate"
            value={`${money(q.estimated_low)} – ${money(q.estimated_high)}`}
          />
          <Row label="Move date" value={q.move_date} />
          <Row label="Created" value={new Date(String(q.created_at)).toLocaleString()} />
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Assigned broker</span>
              <div className="w-[180px]">{brokerSlot}</div>
            </div>
            <LabeledSelect
              label="Priority"
              value={priority}
              options={PRIORITIES as unknown as string[]}
              onChange={(v) => {
                setPriority(v);
                void patchQuote(q.id, { priority: v });
              }}
            />
            <LabeledSelect
              label="Source"
              value={source}
              options={SOURCES as unknown as string[]}
              onChange={(v) => {
                setSource(v);
                void patchQuote(q.id, { source: v });
              }}
            />
            <LabeledSelect
              label="Service type"
              value={serviceType}
              options={SERVICE_TYPES as unknown as string[]}
              onChange={(v) => {
                setServiceType(v);
                void patchQuote(q.id, { service_type: v });
              }}
            />
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className={`capitalize ${PRIORITY_STYLE[priority] ?? ""}`}>
                {priority} priority
              </Badge>
            </div>
          </div>
        </Section>

        <Section
          title={
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3 w-3" /> Internal tags
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
                  aria-label={`Remove tag ${t}`}
                  onClick={() => void saveTags(tags.filter((x) => x !== t))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {tags.length === 0 && <span className="text-sm text-muted-foreground">No tags</span>}
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
              placeholder="Add tag…"
              className="h-8"
            />
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-accent"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </button>
          </form>
          {workflowSlot && <div className="mt-4 border-t border-border pt-3">{workflowSlot}</div>}
        </Section>

        <Section title="Customer profile">
          <Row label="Name" value={(details as { fullName?: string }).fullName} />
          <Row label="Email" value={q.contact_email} />
          <Row label="Phone" value={q.contact_phone} />
          <Row
            label="Preferred contact"
            value={(details as { contactMethod?: string }).contactMethod}
          />
          <Row label="Best time to call" value={(details as { contactTime?: string }).contactTime} />
          <LabeledSelect
            label="Language"
            value={language}
            options={LANGUAGES as unknown as string[]}
            onChange={(v) => {
              setLanguage(v);
              void patchQuote(q.id, { customer_language: v });
            }}
          />
          <Row label="Customer notes" value={q.inventory_notes} />
        </Section>

        <Section title="Move summary">
          <Row label="Type" value={q.move_type} />
          <Row label="Distance" value={q.distance_miles ? `${q.distance_miles} mi` : null} />
          <Row label="Preferred time" value={q.preferred_time} />
          <Row label="Flexible date" value={q.flexible_date} />
          <Row label="Insurance" value={q.insurance_tier} />
          <Row label="Truck" value={q.truck_size} />
          <Row label="Crew" value={q.num_movers ? `${q.num_movers} movers` : null} />
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AddressCard
          title="Origin"
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
          title="Destination"
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

      <Section title="Route">
        {originPt || destPt ? (
          <LeadMap
            origin={originPt}
            destination={destPt}
            originLabel={String(q.origin_address ?? q.origin_city ?? "Origin")}
            destinationLabel={String(q.destination_address ?? q.destination_city ?? "Destination")}
          />
        ) : (
          <Empty>No geocoded addresses on this lead yet.</Empty>
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
  return (
    <Section
      title={
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {props.title}
        </span>
      }
    >
      <Row label="Full address" value={props.address} />
      <Row label="City / State" value={[props.city, props.state].filter(Boolean).join(", ")} />
      <Row label="ZIP" value={props.zip} />
      <Row label="Building type" value={props.buildingType} />
      <Row label="Floor" value={props.floor} />
      <Row label="Stairs (flights)" value={props.stairs} />
      <Row label="Elevator" value={props.elevator} />
      <Row label="Parking" value={props.parking} />
      <Row
        label="Walking distance"
        value={props.longCarry ? "Long carry" : (props.carry ?? null)}
      />
      <Row label="Notes" value={props.notes} />
    </Section>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[180px] capitalize">
          <SelectValue placeholder="Not set" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="capitalize">
              {o.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
