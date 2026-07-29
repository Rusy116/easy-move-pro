import { useEffect, useState, type ReactNode } from "react";
import { isFeatureEnabled, readLocalOverrides, type FeatureFlag } from "@/lib/feature-flags";
import { loadRoleContext, type PlatformRole } from "@/lib/roles";

/**
 * Reads a feature flag for the signed-in user's role.
 * Hydration-safe: the first render uses the static config, then local
 * overrides + the user's role are applied after mount.
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [overrides, setOverrides] = useState<Partial<Record<FeatureFlag, boolean>>>({});

  useEffect(() => {
    let cancelled = false;
    setOverrides(readLocalOverrides());
    loadRoleContext().then((ctx) => {
      if (!cancelled) setRole(ctx?.primaryRole ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isFeatureEnabled(flag, role, overrides);
}

/** Renders children only when the flag is on for the current role. */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
}
