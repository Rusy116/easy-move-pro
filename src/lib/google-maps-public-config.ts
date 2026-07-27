const LOVABLE_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com"];

export const PRODUCTION_GOOGLE_MAPS_HOSTS = ["easymove.pro", "www.easymove.pro"] as const;

export function isLovableMapsHost(hostname: string): boolean {
  return LOVABLE_HOST_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix));
}

export function isEasyMoveProductionHost(hostname: string): boolean {
  return (PRODUCTION_GOOGLE_MAPS_HOSTS as readonly string[]).includes(hostname.toLowerCase());
}
