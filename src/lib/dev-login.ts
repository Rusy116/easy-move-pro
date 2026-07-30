import type { PlatformRole } from "@/lib/roles";

/**
 * Development / QA quick-login.
 *
 * Hard rule: this is a development-only convenience. It is compiled out of
 * production builds unless VITE_ENABLE_DEV_LOGIN is explicitly set to "on".
 */
export const DEV_LOGIN_ENABLED =
  import.meta.env.VITE_ENABLE_DEV_LOGIN === "on" ||
  (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LOGIN !== "off");

export type DevRole = PlatformRole;

export const DEV_ACCOUNTS: { role: DevRole; label: string; email: string }[] = [
  { role: "admin", label: "Super Admin", email: "admin@demo.easymoving.test" },
  { role: "broker", label: "Broker", email: "broker1@demo.easymoving.test" },
  { role: "mover", label: "Moving Company", email: "company1@demo.easymoving.test" },
  { role: "customer", label: "Customer", email: "customer01@demo.easymoving.test" },
];
