import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Moving company registration + administrator approval workflow.
 * Companies self-register (status: pending) and can sign in immediately,
 * but only "approved" companies ever receive leads.
 */

export type CompanyStatus = "pending" | "approved" | "rejected" | "suspended";

function digits(raw: string) {
  return (raw ?? "").replace(/\D/g, "");
}

function list(v: unknown, max = 200): string[] {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean).slice(0, max);
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

export type PartnerApplicationInput = {
  companyName: string;
  ownerFirstName: string;
  ownerLastName: string;
  email: string;
  phone: string;
  password: string;
  dotNumber?: string;
  mcNumber?: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  website?: string;
  insuranceCarrier?: string;
  insurancePolicy?: string;
  insuranceExpires?: string;
  fleetSize?: string | number;
  moversCount?: string | number;
  serviceStates?: string[] | string;
  serviceCities?: string[] | string;
  servicesOffered?: string[] | string;
};

/** Public: create a moving company account with "Pending approval" status. */
export const registerPartnerCompany = createServerFn({ method: "POST" })
  .inputValidator((i: PartnerApplicationInput) => {
    const companyName = (i.companyName ?? "").trim();
    const ownerFirstName = (i.ownerFirstName ?? "").trim();
    const ownerLastName = (i.ownerLastName ?? "").trim();
    const email = (i.email ?? "").trim().toLowerCase();
    const phone = (i.phone ?? "").trim();
    const password = i.password ?? "";
    if (!companyName || companyName.length > 160) throw new Error("Company name is required");
    if (!ownerFirstName) throw new Error("Owner first name is required");
    if (!ownerLastName) throw new Error("Owner last name is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required");
    if (digits(phone).length < 10) throw new Error("A valid phone number is required");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");

    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 100000) : null;
    };

    return {
      companyName,
      ownerFirstName,
      ownerLastName,
      email,
      phone,
      password,
      dotNumber: (i.dotNumber ?? "").trim() || null,
      mcNumber: (i.mcNumber ?? "").trim() || null,
      addressLine1: (i.addressLine1 ?? "").trim() || null,
      addressCity: (i.addressCity ?? "").trim() || null,
      addressState: (i.addressState ?? "").trim().toUpperCase() || null,
      addressZip: (i.addressZip ?? "").trim() || null,
      website: (i.website ?? "").trim() || null,
      insuranceCarrier: (i.insuranceCarrier ?? "").trim() || null,
      insurancePolicy: (i.insurancePolicy ?? "").trim() || null,
      insuranceExpires: (i.insuranceExpires ?? "").trim() || null,
      fleetSize: num(i.fleetSize),
      moversCount: num(i.moversCount),
      serviceStates: list(i.serviceStates, 60).map((s) => s.toUpperCase()),
      serviceCities: list(i.serviceCities),
      servicesOffered: list(i.servicesOffered, 40),
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fullName = `${data.ownerFirstName} ${data.ownerLastName}`.trim();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Could not create the account");
    const userId = created.user.id;

    const { data: company, error: cErr } = await supabaseAdmin
      .from("moving_companies")
      .insert({
        name: data.companyName,
        email: data.email,
        phone: data.phone,
        dot_number: data.dotNumber,
        mc_number: data.mcNumber,
        owner_first_name: data.ownerFirstName,
        owner_last_name: data.ownerLastName,
        address_line1: data.addressLine1,
        address_city: data.addressCity,
        address_state: data.addressState,
        address_zip: data.addressZip,
        website: data.website,
        insurance_carrier: data.insuranceCarrier,
        insurance_policy: data.insurancePolicy,
        insurance_expires: data.insuranceExpires,
        fleet_size: data.fleetSize,
        movers_count: data.moversCount,
        service_states: data.serviceStates,
        service_cities: data.serviceCities,
        services_offered: data.servicesOffered,
        license_status: "pending",
        status: "pending",
      } as never)
      .select("id")
      .single();

    if (cErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw new Error(cErr.message);
    }

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      first_name: data.ownerFirstName,
      last_name: data.ownerLastName,
      phone: data.phone,
      status: "active",
    } as never);

    await supabaseAdmin
      .from("company_members")
      .insert({ company_id: (company as { id: string }).id, user_id: userId, role: "owner" } as never);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "mover" } as never);

    await supabaseAdmin.from("admin_notifications").insert({
      type: "company_application",
      message: `${data.companyName} applied to join the carrier network`,
    } as never);

    return { companyId: (company as { id: string }).id };
  });

/** Administrator: approve / reject / suspend / restore a moving company. */
export const adminSetCompanyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { companyId: string; status: CompanyStatus; reason?: string }) => {
    if (!i.companyId) throw new Error("Missing company");
    if (!["pending", "approved", "rejected", "suspended"].includes(i.status)) {
      throw new Error("Invalid status");
    }
    const reason = (i.reason ?? "").trim();
    if (i.status === "rejected" && reason.length < 5) {
      throw new Error("A rejection reason is required");
    }
    return { companyId: i.companyId, status: i.status as CompanyStatus, reason: reason || null };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: administrator access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("moving_companies")
      .update({
        status: data.status,
        rejection_reason: data.status === "rejected" ? data.reason : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      } as never)
      .eq("id", data.companyId);
    if (error) throw new Error(error.message);

    // A company that loses lead eligibility must not keep open invitations.
    if (data.status === "rejected" || data.status === "suspended") {
      await supabaseAdmin
        .from("quote_assignments")
        .update({ state: "withdrawn", closed_at: new Date().toISOString() } as never)
        .eq("company_id", data.companyId)
        .in("state", ["invited", "active", "quoted"]);
    }

    return { ok: true };
  });
