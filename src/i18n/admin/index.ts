import type { AdminModuleDict } from "./types";
import { shell } from "./shell";
import { finance } from "./finance";
import { dashboard } from "./dashboard";
import { reports } from "./reports";
import { orders } from "./orders";
import { companies } from "./companies";
import { brokers } from "./brokers";
import { customers } from "./customers";
import { marketplace } from "./marketplace";
import { invoices } from "./invoices";
import { impersonation } from "./impersonation";
import { job } from "./job";
import { settings } from "./settings";
import { ai } from "./ai";

export const ADMIN_MODULES: AdminModuleDict[] = [
  shell,
  finance,
  dashboard,
  reports,
  orders,
  companies,
  brokers,
  customers,
  marketplace,
  invoices,
  impersonation,
  job,
  settings,
  ai,
];

function merge(locale: keyof AdminModuleDict): Record<string, string> {
  return Object.assign({}, ...ADMIN_MODULES.map((m) => m[locale])) as Record<string, string>;
}

export const adminEn = merge("en");
export const adminRu = merge("ru");
export const adminEs = merge("es");

export type { AdminModuleDict };
