import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { en, type TranslationKey } from "./locales/en";
import { es } from "./locales/es";
import { ru } from "./locales/ru";

/**
 * Enterprise i18n core.
 *
 * Adding a new language is a two-step change with no architecture impact:
 *   1. create `locales/<code>.ts` mirroring the `Dictionary` type,
 *   2. register it in `LOCALES` below.
 *
 * The database never stores translated text — only stable keys such as
 * `published`, which the UI resolves through `t("status.lead.published")`.
 */

export type Locale = "en" | "es" | "ru";

export const LOCALES: Record<
  Locale,
  { code: Locale; label: string; english: string; flag: string; intl: string; currency: string }
> = {
  en: { code: "en", label: "English", english: "English", flag: "🇺🇸", intl: "en-US", currency: "USD" },
  es: { code: "es", label: "Español", english: "Spanish", flag: "🇪🇸", intl: "es-US", currency: "USD" },
  ru: { code: "ru", label: "Русский", english: "Russian", flag: "🇷🇺", intl: "ru-RU", currency: "USD" },
};

export const LOCALE_LIST = Object.values(LOCALES);

const DICTIONARIES: Record<Locale, Record<string, string>> = {
  en: { ...en, ...adminEn },
  es: { ...es, ...adminEs },
  ru: { ...ru, ...adminRu },
};

export const DEFAULT_LOCALE: Locale = "en";
const STORAGE_KEY = "em.locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in LOCALES;
}

/** Pure translate helper — usable outside React (PDFs, emails, server code). */
export function translate(
  locale: Locale,
  key: TranslationKey | string,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  const raw = dict[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
    vars[name] === undefined ? `{{${name}}}` : String(vars[name]),
  );
}

// ---------------------------------------------------------------- formatters

export function formatDate(
  locale: Locale,
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALES[locale].intl, options).format(date);
}

export function formatDateTime(locale: Locale, value: string | number | Date | null | undefined) {
  return formatDate(locale, value, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(
  locale: Locale,
  amount: number | null | undefined,
  currency = LOCALES[locale].currency,
) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat(LOCALES[locale].intl, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(locale: Locale, value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(LOCALES[locale].intl).format(value);
}

/** US numbers render as (555) 123-4567; other locales use +1 555 123 4567. */
export function formatPhone(locale: Locale, raw: string | null | undefined) {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw;
  const [a, b, c] = [ten.slice(0, 3), ten.slice(3, 6), ten.slice(6)];
  return locale === "en" ? `(${a}) ${b}-${c}` : `+1 ${a} ${b} ${c}`;
}

/** US-style address block; locales that lead with the street keep the same order. */
export function formatAddress(
  _locale: Locale,
  parts: { line1?: string | null; city?: string | null; state?: string | null; zip?: string | null },
) {
  const tail = [parts.city, [parts.state, parts.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [parts.line1, tail].filter(Boolean).join(", ");
}

// ------------------------------------------------------------------ context

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey | string, vars?: Record<string, string | number>) => string;
  formatDate: (v: string | number | Date | null | undefined, o?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (v: string | number | Date | null | undefined) => string;
  formatCurrency: (v: number | null | undefined, currency?: string) => string;
  formatNumber: (v: number | null | undefined) => string;
  formatPhone: (v: string | null | undefined) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : null;
}

function detectBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  for (const lang of navigator.languages ?? [navigator.language]) {
    const code = lang?.slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR always renders the default locale, then hydration applies the user's choice.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = readStoredLocale() ?? detectBrowserLocale();
    if (stored) setLocaleState(stored);

    // The profile is the durable source of truth so the choice survives logout.
    let cancelled = false;
    const syncFromProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", data.user.id)
        .maybeSingle();
      const lang = (profile as { language?: string } | null)?.language;
      if (!cancelled && isLocale(lang)) {
        setLocaleState(lang);
        window.localStorage.setItem(STORAGE_KEY, lang);
      }
    };
    void syncFromProfile();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void syncFromProfile();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next); // instant switch, no page reload
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from("profiles").update({ language: next } as never).eq("id", data.user.id);
    })();
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      formatDate: (v, o) => formatDate(locale, v, o),
      formatDateTime: (v) => formatDateTime(locale, v),
      formatCurrency: (v, currency) => formatCurrency(locale, v, currency),
      formatNumber: (v) => formatNumber(locale, v),
      formatPhone: (v) => formatPhone(locale, v),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  // Defensive fallback so a component rendered outside the provider still works.
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
    formatDate: (v, o) => formatDate(DEFAULT_LOCALE, v, o),
    formatDateTime: (v) => formatDateTime(DEFAULT_LOCALE, v),
    formatCurrency: (v, currency) => formatCurrency(DEFAULT_LOCALE, v, currency),
    formatNumber: (v) => formatNumber(DEFAULT_LOCALE, v),
    formatPhone: (v) => formatPhone(DEFAULT_LOCALE, v),
  };
}

/** Shorthand for components that only need the translate function. */
export function useT() {
  return useI18n().t;
}

/** Resolve a database status key (never a translated value) into UI text. */
export function useStatusLabel() {
  const { t } = useI18n();
  return (domain: "lead" | "job", key: string | null | undefined) =>
    key ? t(`status.${domain}.${key}`) : "—";
}

export type { TranslationKey };
