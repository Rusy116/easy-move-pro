/**
 * Admin i18n module contract.
 *
 * Every admin area owns one file in this folder that exports an
 * `AdminModuleDict`. Keys are namespaced `admin.<module>.<key>` (or
 * `status.<domain>.<value>` for display labels of database enum values).
 *
 * Database values are NEVER translated — only their display labels.
 */
export type AdminModuleDict = {
  en: Record<string, string>;
  ru: Record<string, string>;
  es: Record<string, string>;
};
