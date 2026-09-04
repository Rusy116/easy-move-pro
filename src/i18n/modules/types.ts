/**
 * Site-wide i18n module contract (non-admin modules + shared display labels).
 *
 * Keys are namespaced by module, e.g. `agent.<internal_key>.name`.
 * Database values (agent keys, statuses, enums) are NEVER translated —
 * only their display representation is.
 */
export type ModuleDict = {
  en: Record<string, string>;
  ru: Record<string, string>;
  es: Record<string, string>;
};
