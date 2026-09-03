import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Package, ImageIcon } from "lucide-react";
import { INVENTORY_CATALOG, CATEGORY_LABEL, type InventoryItem } from "@/lib/inventory";
import { useT } from "@/i18n";
import { Section, Empty, type LeadQuote } from "./shared";

type Entry = { id: string; quantity: number; photos?: string[] };

const FRAGILE = new Set(["mirror", "china-cabinet", "glass-table", "artwork"]);

function isFragile(item: InventoryItem): boolean {
  return FRAGILE.has(item.id) || item.category === "tv";
}

export function InventorySection({ q }: { q: LeadQuote }) {
  const tr = useT();
  const entries = (Array.isArray(q.inventory) ? q.inventory : []) as Entry[];
  const packing = Boolean(q.packing);

  const rooms = useMemo(() => {
    const byCat = new Map<string, Array<{ item: InventoryItem; entry: Entry }>>();
    for (const e of entries) {
      const item = INVENTORY_CATALOG.find((i) => i.id === e.id);
      if (!item) continue;
      const list = byCat.get(item.category) ?? [];
      list.push({ item, entry: e });
      byCat.set(item.category, list);
    }
    return [...byCat.entries()].map(([cat, list]) => ({
      cat,
      label: CATEGORY_LABEL[cat as InventoryItem["category"]] ?? cat,
      list,
      cuft: list.reduce((s, r) => s + r.item.cubicFeet * r.entry.quantity, 0),
      lbs: list.reduce((s, r) => s + r.item.weightLbs * r.entry.quantity, 0),
      count: list.reduce((s, r) => s + r.entry.quantity, 0),
    }));
  }, [entries]);

  const totals = useMemo(
    () => ({
      cuft: rooms.reduce((s, r) => s + r.cuft, 0),
      lbs: rooms.reduce((s, r) => s + r.lbs, 0),
      count: rooms.reduce((s, r) => s + r.count, 0),
    }),
    [rooms],
  );

  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (entries.length === 0)
    return <Empty>{tr("admin.shell.leadInventory.empty")}</Empty>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Total
          label={tr("admin.shell.leadInventory.cubicFeet")}
          value={tr("admin.shell.leadInventory.cubicFeetValue", {
            value: Math.round(totals.cuft || Number(q.estimated_cubic_feet ?? 0)).toLocaleString(),
          })}
        />
        <Total
          label={tr("admin.shell.leadInventory.weight")}
          value={tr("admin.shell.leadInventory.weightValue", {
            value: Math.round(totals.lbs || Number(q.estimated_weight_lbs ?? 0)).toLocaleString(),
          })}
        />
        <Total label={tr("admin.shell.leadInventory.items")} value={totals.count.toLocaleString()} />
      </div>

      <div className="space-y-2">
        {rooms.map((r) => {
          const isOpen = open[r.cat] ?? true;
          return (
            <div key={r.cat} className="rounded-xl border border-border bg-card/50">
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [r.cat]: !isOpen }))}
                className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{r.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {tr("admin.shell.leadInventory.roomSummary", {
                    count: r.count,
                    cuft: Math.round(r.cuft),
                    lbs: Math.round(r.lbs),
                  })}
                </span>
              </button>
              {isOpen && (
                <ul className="border-t border-border">
                  {r.list.map(({ item, entry }) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 px-4 py-2 text-sm last:border-0"
                    >
                      <span className="font-semibold">{entry.quantity}×</span>
                      <span>{item.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {tr("admin.shell.leadInventory.itemDims", {
                          cuft: item.cubicFeet * entry.quantity,
                          lbs: item.weightLbs * entry.quantity,
                        })}
                      </span>
                      {isFragile(item) && (
                        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          {tr("admin.shell.leadInventory.fragile")}
                        </span>
                      )}
                      {item.heavy && (
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {tr("admin.shell.leadInventory.heavy")}
                        </span>
                      )}
                      {packing && (
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {tr("admin.shell.leadInventory.packing")}
                        </span>
                      )}
                      {entry.photos?.length ? (
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {entry.photos.length}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-3 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
