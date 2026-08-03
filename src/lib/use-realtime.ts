import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to Postgres changes on one or more tables and run a callback
 * (debounced) whenever anything changes. Used to keep every role dashboard
 * in sync without a manual refresh.
 */
export function useRealtimeTables(
  channelKey: string,
  tables: string[],
  onChange: () => void,
  enabled = true,
) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = tables.join(",");

  useEffect(() => {
    if (!enabled || !key) return;
    let timer: number | undefined;
    const fire = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => cb.current(), 300);
    };

    let channel = supabase.channel(`rt-${channelKey}`);
    for (const table of key.split(",")) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        fire,
      );
    }
    channel.subscribe();

    return () => {
      if (timer) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [channelKey, key, enabled]);
}
