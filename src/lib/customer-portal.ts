import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LeadStatus } from "@/lib/lead-status";

/* ------------------------------------------------------------------ */
/*                               Types                                 */
/* ------------------------------------------------------------------ */

export type CustomerMove = {
  id: string;
  quote_number: string | null;
  portal_token: string | null;
  created_at: string;
  move_date: string | null;
  final_move_date: string | null;
  arrival_window: string | null;
  move_type: string | null;
  property_type: string;
  pickup_property_type: string | null;
  delivery_property_type: string | null;
  origin_address: string | null;
  destination_address: string | null;
  origin_city: string | null;
  origin_state: string | null;
  origin_zip: string;
  destination_city: string | null;
  destination_state: string | null;
  destination_zip: string;
  distance_miles: number | null;
  estimated_low: number;
  estimated_high: number;
  estimated_cubic_feet: number | null;
  estimated_weight_lbs: number | null;
  final_price: number | null;
  company_notes: string | null;
  crew_size: number | null;
  final_truck_size: string | null;
  packing: boolean;
  unpacking: boolean;
  storage: boolean;
  assembly: boolean;
  junk_removal: boolean;
  insurance_tier: string | null;
  inventory: unknown;
  breakdown: unknown;
  lead_status: LeadStatus;
  lead_status_updated_at: string;
  job_status: string;
  status: string;
  assigned_company_id: string | null;
  assigned_broker_id: string | null;
  accepted_at: string | null;
  cancellation_reason: string | null;
  cancellation_note: string | null;
  cancelled_at: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export type CustomerNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  quote_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type AssignedCompany = {
  id: string;
  name: string;
  logo_url: string | null;
  rating: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  dot_number: string | null;
  mc_number: string | null;
  license_status: string;
  insurance_carrier: string | null;
  insurance_expires: string | null;
  service_states: string[];
  service_cities: string[];
};

export type TimelineEntry = {
  id: string;
  label: string;
  detail?: string | null;
  at: string;
  kind: "status" | "event";
};

export type MoveDocument = {
  id: string;
  name: string;
  kind: string;
  external_url: string | null;
  storage_path: string | null;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type CustomerMessage = {
  id: string;
  body: string;
  sender_role: string;
  sender_name: string | null;
  created_at: string;
};

export type CustomerPurchase = {
  id: string;
  title: string;
  version: string;
  download_url: string | null;
  purchased_at: string;
  amount_cents: number;
  status: string;
};

export type CustomerReview = {
  id: string;
  quote_id: string;
  rating_professionalism: number;
  rating_communication: number;
  rating_punctuality: number;
  rating_overall: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

export type CustomerPreferences = {
  email_status_updates: boolean;
  email_messages: boolean;
  email_marketing: boolean;
  sms_status_updates: boolean;
};

export const CANCELLATION_REASONS = [
  "Too expensive",
  "Changed plans",
  "Found another company",
  "Wrong date",
  "Personal reasons",
  "Other",
] as const;

const MOVE_COLUMNS =
  "id,quote_number,portal_token,created_at,move_date,final_move_date,arrival_window,move_type,property_type,pickup_property_type,delivery_property_type,origin_address,destination_address,origin_city,origin_state,origin_zip,destination_city,destination_state,destination_zip,distance_miles,estimated_low,estimated_high,estimated_cubic_feet,estimated_weight_lbs,final_price,company_notes,crew_size,final_truck_size,packing,unpacking,storage,assembly,junk_removal,insurance_tier,inventory,breakdown,lead_status,lead_status_updated_at,job_status,status,assigned_company_id,assigned_broker_id,accepted_at,cancellation_reason,cancellation_note,cancelled_at,contact_email,contact_phone";

/* ------------------------------------------------------------------ */
/*                               Moves                                 */
/* ------------------------------------------------------------------ */

export function useMyMoves() {
  const [moves, setMoves] = useState<CustomerMove[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setMoves([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("quotes")
      .select(MOVE_COLUMNS)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });
    setMoves((data ?? []) as unknown as CustomerMove[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    const ch = supabase
      .channel("customer-moves")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotes" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [reload]);

  /** The move the customer is most likely tracking right now. */
  const activeMove = useMemo(() => {
    const open = moves.filter(
      (m) => !["completed", "cancelled", "rejected"].includes(m.lead_status),
    );
    return open[0] ?? moves[0] ?? null;
  }, [moves]);

  return { moves, activeMove, loading, reload };
}

/* ------------------------------------------------------------------ */
/*                             Timeline                                */
/* ------------------------------------------------------------------ */

const EVENT_LABEL: Record<string, string> = {
  quote_submitted: "Quote submitted",
  lead_qualified: "Qualified by broker",
  lead_published: "Published to marketplace",
  company_claimed: "Moving company claimed the job",
  claimed: "Moving company claimed the job",
  contacted: "Moving company contacted you",
  price_confirmed: "Final price confirmed",
  customer_confirmed: "You confirmed the move",
  customer_cancelled: "Move cancelled",
  completed: "Move completed",
};

export function useMoveTimeline(quoteId: string | null) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!quoteId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const [history, events] = await Promise.all([
      supabase
        .from("quote_status_history")
        .select("id,from_status,to_status,created_at")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true }),
      supabase
        .from("lead_events")
        .select("id,event_type,payload,created_at")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true }),
    ]);

    const rows: TimelineEntry[] = [
      ...((history.data ?? []) as Array<Record<string, string>>).map((h) => ({
        id: `s-${h.id}`,
        label: prettify(h.to_status),
        detail: h.from_status ? `from ${prettify(h.from_status)}` : null,
        at: h.created_at,
        kind: "status" as const,
      })),
      ...((events.data ?? []) as Array<Record<string, string>>).map((e) => ({
        id: `e-${e.id}`,
        label: EVENT_LABEL[e.event_type] ?? prettify(e.event_type),
        detail: null,
        at: e.created_at,
        kind: "event" as const,
      })),
    ].sort((a, b) => a.at.localeCompare(b.at));

    setEntries(rows);
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { entries, loading, reload };
}

function prettify(value: string | null | undefined) {
  if (!value) return "Updated";
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*                          Assigned company                           */
/* ------------------------------------------------------------------ */

export function useAssignedCompany(companyId: string | null | undefined) {
  const [company, setCompany] = useState<AssignedCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!companyId) {
        setCompany(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("moving_companies")
        .select(
          "id,name,logo_url,rating,phone,email,website,dot_number,mc_number,license_status,insurance_carrier,insurance_expires,service_states,service_cities",
        )
        .eq("id", companyId)
        .maybeSingle();
      if (!cancelled) {
        setCompany((data as unknown as AssignedCompany) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { company, loading };
}

/* ------------------------------------------------------------------ */
/*                           Notifications                             */
/* ------------------------------------------------------------------ */

export function useCustomerNotifications(limit = 50) {
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("customer_notifications")
      .select("id,type,title,body,quote_id,read_at,created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    setItems((data ?? []) as CustomerNotification[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    void reload();
    const ch = supabase
      .channel("customer-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_notifications" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [reload]);

  const unread = items.filter((n) => !n.read_at).length;

  const markRead = useCallback(
    async (id: string) => {
      await supabase
        .from("customer_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      await reload();
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase
      .from("customer_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", auth.user.id)
      .is("read_at", null);
    await reload();
  }, [reload]);

  return { items, unread, loading, reload, markRead, markAllRead };
}

/* ------------------------------------------------------------------ */
/*                             Documents                               */
/* ------------------------------------------------------------------ */

export function useMoveDocuments(quoteId: string | null) {
  const [docs, setDocs] = useState<MoveDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!quoteId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("company_documents")
      .select("id,name,kind,external_url,storage_path,mime,size_bytes,created_at")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as MoveDocument[]);
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { docs, loading, reload };
}

export async function getDocumentUrl(doc: MoveDocument): Promise<string | null> {
  if (doc.external_url) return doc.external_url;
  if (!doc.storage_path) return null;
  const { data } = await supabase.storage
    .from("company-documents")
    .createSignedUrl(doc.storage_path, 60 * 10);
  return data?.signedUrl ?? null;
}

/* ------------------------------------------------------------------ */
/*                              Messages                               */
/* ------------------------------------------------------------------ */

export function useCustomerMessages(quoteId: string | null) {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!quoteId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const { data: conv } = await supabase
      .from("company_conversations")
      .select("id")
      .eq("quote_id", quoteId)
      .eq("kind", "broker")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!conv) {
      setConversationId(null);
      setMessages([]);
      setLoading(false);
      return;
    }
    setConversationId(conv.id);
    const { data } = await supabase
      .from("company_messages")
      .select("id,body,sender_role,sender_name,created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as CustomerMessage[]);
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    void reload();
    const ch = supabase
      .channel(`customer-messages-${quoteId ?? "none"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_messages" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [reload, quoteId]);

  const send = useCallback(
    async (body: string, companyId: string, senderName: string) => {
      if (!quoteId || !body.trim()) return;
      let convId = conversationId;
      if (!convId) {
        const { data, error } = await supabase.rpc("fn_customer_start_conversation", {
          _quote_id: quoteId,
        });
        if (error) throw error;
        convId = data as unknown as string;
        setConversationId(convId);
      }
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("company_messages").insert({
        conversation_id: convId,
        company_id: companyId,
        sender_user_id: auth.user?.id ?? null,
        sender_role: "customer",
        sender_name: senderName,
        body: body.trim(),
      });
      if (error) throw error;
      await reload();
    },
    [conversationId, quoteId, reload],
  );

  return { messages, conversationId, loading, reload, send };
}

/* ------------------------------------------------------------------ */
/*                             My library                              */
/* ------------------------------------------------------------------ */

export function useCustomerPurchases() {
  const [items, setItems] = useState<CustomerPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("customer_purchases")
        .select("id,title,version,download_url,purchased_at,amount_cents,status")
        .eq("user_id", auth.user.id)
        .order("purchased_at", { ascending: false });
      setItems((data ?? []) as CustomerPurchase[]);
      setLoading(false);
    })();
  }, []);

  return { items, loading };
}

/* ------------------------------------------------------------------ */
/*                               Reviews                               */
/* ------------------------------------------------------------------ */

export function useMyReviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("customer_reviews")
      .select(
        "id,quote_id,rating_professionalism,rating_communication,rating_punctuality,rating_overall,title,body,created_at",
      )
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });
    setReviews((data ?? []) as CustomerReview[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { reviews, loading, reload };
}

/* ------------------------------------------------------------------ */
/*                             Preferences                             */
/* ------------------------------------------------------------------ */

const DEFAULT_PREFS: CustomerPreferences = {
  email_status_updates: true,
  email_messages: true,
  email_marketing: false,
  sms_status_updates: false,
};

export function useCustomerPreferences() {
  const [prefs, setPrefs] = useState<CustomerPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("customer_preferences")
        .select("email_status_updates,email_messages,email_marketing,sms_status_updates")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (data) setPrefs(data as CustomerPreferences);
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (next: CustomerPreferences) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setPrefs(next);
    await supabase
      .from("customer_preferences")
      .upsert({ user_id: auth.user.id, ...next }, { onConflict: "user_id" });
  }, []);

  return { prefs, loading, save };
}

/* ------------------------------------------------------------------ */
/*                               Actions                               */
/* ------------------------------------------------------------------ */

export async function confirmMove(quoteId: string) {
  const { error } = await supabase.rpc("fn_customer_confirm_move", { _quote_id: quoteId });
  if (error) throw error;
}

export async function cancelMove(quoteId: string, reason: string, note: string) {
  const { error } = await supabase.rpc("fn_customer_cancel_move", {
    _quote_id: quoteId,
    _reason: reason,
    _note: note,
  });
  if (error) throw error;
}

export async function submitReview(input: {
  quoteId: string;
  professionalism: number;
  communication: number;
  punctuality: number;
  overall: number;
  title: string;
  body: string;
}) {
  const { error } = await supabase.rpc("fn_customer_submit_review", {
    _quote_id: input.quoteId,
    _professionalism: input.professionalism,
    _communication: input.communication,
    _punctuality: input.punctuality,
    _overall: input.overall,
    _title: input.title,
    _body: input.body,
  });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*                              Helpers                                */
/* ------------------------------------------------------------------ */

export function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function routeLabel(move: CustomerMove) {
  const from = move.origin_city ?? move.origin_zip;
  const to = move.destination_city ?? move.destination_zip;
  return `${from} → ${to}`;
}
