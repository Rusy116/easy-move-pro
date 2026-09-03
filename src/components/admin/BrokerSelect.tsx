import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listBrokers, type BrokerRow } from "@/lib/admin.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n/admin";

let cache: BrokerRow[] | null = null;

export function useBrokers() {
  const [brokers, setBrokers] = useState<BrokerRow[]>(cache ?? []);
  const fetchBrokers = useServerFn(listBrokers);
  useEffect(() => {
    if (cache) return;
    (async () => {
      try {
        const list = await fetchBrokers();
        cache = list;
        setBrokers(list);
      } catch {
        /* silent */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return brokers;
}

export function BrokerSelect({
  value,
  onChange,
  size = "default",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  size?: "default" | "sm";
}) {
  const brokers = useBrokers();
  const tr = useT();
  const label = useMemo(() => {
    if (!value) return null;
    const b = brokers.find((x) => x.id === value);
    return b?.full_name || b?.email || value.slice(0, 8);
  }, [brokers, value]);

  return (
    <Select value={value ?? "__none"} onValueChange={(v) => onChange(v === "__none" ? null : v)}>
      <SelectTrigger className={size === "sm" ? "h-7 text-xs" : "h-9"}>
        <SelectValue placeholder={tr("admin.shell.brokerSelect.unassigned")}>
          {label ? (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3 w-3" />
              {label}
            </span>
          ) : (
            <span className="text-muted-foreground">{tr("admin.shell.brokerSelect.unassigned")}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">{tr("admin.shell.brokerSelect.unassigned")}</SelectItem>
        {brokers.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.full_name || b.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export async function assignBroker(quoteId: string, brokerId: string | null) {
  // Goes through the workflow function so the timeline, audit log and broker
  // notification stay in sync with the assignment.
  const { error } = await supabase.rpc("fn_assign_broker", {
    _quote_id: quoteId,
    _broker_id: brokerId as string,
  });
  if (error) toast.error(error.message);
  else toast.success(brokerId ? "Broker assigned" : "Broker cleared");
  return !error;
}
