import type { ModuleDict } from "./types";
import { agents } from "./agents";
import { aipages } from "./aipages";
import { company } from "./company";
import { company2 } from "./company2";
import { company3 } from "./company3";
import { portals } from "./portals";
import { site } from "./site";
import { store } from "./store";

export const SITE_MODULES: ModuleDict[] = [agents, aipages, company, company2, company3, portals, site, store];

function merge(locale: keyof ModuleDict): Record<string, string> {
  return Object.assign({}, ...SITE_MODULES.map((m) => m[locale])) as Record<string, string>;
}

export const modulesEn = merge("en");
export const modulesRu = merge("ru");
export const modulesEs = merge("es");

export type { ModuleDict };
