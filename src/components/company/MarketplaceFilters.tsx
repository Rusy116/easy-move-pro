import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AvailableJob } from "@/lib/company-jobs";

export type MarketplaceFilterState = {
  state: string;
  city: string;
  moveType: string;
  homeSize: string;
  dateFrom: string;
  dateTo: string;
  sort: "newest" | "oldest" | "move_date";
};

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilterState = {
  state: "all",
  city: "all",
  moveType: "all",
  homeSize: "all",
  dateFrom: "",
  dateTo: "",
  sort: "newest",
};

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}

/** Applies marketplace filters + sorting to the available job list. */
export function useFilteredMarketplace(jobs: AvailableJob[], f: MarketplaceFilterState) {
  return useMemo(() => {
    const rows = jobs.filter((j) => {
      if (f.state !== "all" && j.origin_state !== f.state && j.destination_state !== f.state)
        return false;
      if (f.city !== "all" && j.origin_city !== f.city && j.destination_city !== f.city)
        return false;
      if (f.moveType !== "all" && (j.move_type ?? "") !== f.moveType) return false;
      if (f.homeSize !== "all" && (j.property_type ?? "") !== f.homeSize) return false;
      if (f.dateFrom && (!j.move_date || j.move_date < f.dateFrom)) return false;
      if (f.dateTo && (!j.move_date || j.move_date > f.dateTo)) return false;
      return true;
    });
    const time = (v?: string | null) => (v ? new Date(v).getTime() : 0);
    return rows.sort((a, b) => {
      if (f.sort === "oldest") return time(a.published_at) - time(b.published_at);
      if (f.sort === "move_date")
        return (a.move_date ?? "9999").localeCompare(b.move_date ?? "9999");
      return time(b.published_at) - time(a.published_at);
    });
  }, [jobs, f]);
}

export function useMarketplaceFilters() {
  return useState<MarketplaceFilterState>(DEFAULT_MARKETPLACE_FILTERS);
}

export function MarketplaceFilters({
  jobs,
  value,
  onChange,
}: {
  jobs: AvailableJob[];
  value: MarketplaceFilterState;
  onChange: (next: MarketplaceFilterState) => void;
}) {
  const states = uniq(jobs.flatMap((j) => [j.origin_state, j.destination_state]));
  const cities = uniq(jobs.flatMap((j) => [j.origin_city, j.destination_city]));
  const moveTypes = uniq(jobs.map((j) => j.move_type));
  const homeSizes = uniq(jobs.map((j) => j.property_type));
  const set = (patch: Partial<MarketplaceFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Select value={value.state} onValueChange={(v) => set({ state: v })}>
        <SelectTrigger>
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All states</SelectItem>
          {states.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.city} onValueChange={(v) => set({ city: v })}>
        <SelectTrigger>
          <SelectValue placeholder="City" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All cities</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.moveType} onValueChange={(v) => set({ moveType: v })}>
        <SelectTrigger>
          <SelectValue placeholder="Move type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All move types</SelectItem>
          {moveTypes.map((m) => (
            <SelectItem key={m} value={m} className="capitalize">
              {m.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.homeSize} onValueChange={(v) => set({ homeSize: v })}>
        <SelectTrigger>
          <SelectValue placeholder="Home size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All home sizes</SelectItem>
          {homeSizes.map((h) => (
            <SelectItem key={h} value={h} className="capitalize">
              {h.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.sort}
        onValueChange={(v) => set({ sort: v as MarketplaceFilterState["sort"] })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="move_date">Soonest move date</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="Move date from"
          value={value.dateFrom}
          onChange={(e) => set({ dateFrom: e.target.value })}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="Move date to"
          value={value.dateTo}
          onChange={(e) => set({ dateTo: e.target.value })}
        />
      </div>
    </div>
  );
}
