import type { PlatformRole } from "@/lib/roles";

/**
 * Feature Flag infrastructure.
 *
 * Flags are declared statically so they are tree-shakeable and SSR-safe.
 * They can be overridden at runtime (browser only) via localStorage:
 *   localStorage.setItem("emp:flags", JSON.stringify({ "billing": true }))
 * or at build time via VITE_FEATURE_<FLAG> = "on" | "off".
 *
 * Nothing here changes existing behaviour: a flag that is `enabled: true`
 * with no `roles` restriction behaves exactly as before.
 */
export type FeatureFlag =
  | "billing"
  | "messaging"
  | "documents"
  | "analytics"
  | "marketplace"
  | "ai-assistant"
  | "notifications";

export type FeatureFlagDefinition = {
  /** Human label used in admin/debug surfaces. */
  label: string;
  /** Default on/off state. */
  enabled: boolean;
  /** When set, the flag is only on for these roles. */
  roles?: PlatformRole[];
  description?: string;
};

export const FEATURE_FLAGS: Record<FeatureFlag, FeatureFlagDefinition> = {
  billing: {
    label: "Billing & invoices",
    enabled: true,
    roles: ["admin", "mover"],
    description: "Invoicing and payment collection for moving companies.",
  },
  messaging: {
    label: "Messaging center",
    enabled: true,
    description: "Real-time conversations between brokers, movers and customers.",
  },
  documents: {
    label: "Documents",
    enabled: true,
    roles: ["admin", "mover"],
    description: "Compliance and job document storage.",
  },
  analytics: {
    label: "Analytics",
    enabled: true,
    roles: ["admin", "broker", "mover"],
    description: "Operational and performance reporting.",
  },
  marketplace: {
    label: "Open marketplace",
    enabled: true,
    description: "Open-market lead claiming for moving companies.",
  },
  "ai-assistant": {
    label: "AI assistant",
    enabled: false,
    description: "Reserved for upcoming AI move-planning modules.",
  },
  notifications: {
    label: "Notifications",
    enabled: true,
    description: "In-app notification center.",
  },
};

const STORAGE_KEY = "emp:flags";

function envOverride(flag: FeatureFlag): boolean | undefined {
  const key = `VITE_FEATURE_${flag.toUpperCase().replace(/-/g, "_")}`;
  const raw = (import.meta.env as Record<string, string | undefined>)[key];
  if (raw === undefined) return undefined;
  return raw === "on" || raw === "true" || raw === "1";
}

/** Browser-only overrides. Returns {} during SSR. */
export function readLocalOverrides(): Partial<Record<FeatureFlag, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<FeatureFlag, boolean>>) : {};
  } catch {
    return {};
  }
}

export function setLocalOverride(flag: FeatureFlag, value: boolean | null) {
  if (typeof window === "undefined") return;
  const next = readLocalOverrides();
  if (value === null) delete next[flag];
  else next[flag] = value;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Resolve a flag. `role` narrows role-scoped flags; omit it to ignore scoping.
 * SSR-safe: local overrides are only applied when `overrides` is passed in.
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  role?: PlatformRole | null,
  overrides: Partial<Record<FeatureFlag, boolean>> = {},
): boolean {
  const def = FEATURE_FLAGS[flag];
  if (!def) return false;

  const override = overrides[flag] ?? envOverride(flag);
  const enabled = override ?? def.enabled;
  if (!enabled) return false;

  if (def.roles && role) return def.roles.includes(role) || role === "admin";
  return true;
}
