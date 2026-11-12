export const locales = ["ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";
export const rtlLocales: Locale[] = ["ar"];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return isRTL(locale) ? "rtl" : "ltr";
}

import ar from "./ar.json";

const translations: Record<Locale, Record<string, string>> = { ar };

export function useTranslations(locale: Locale) {
  const t = translations[locale] || translations[defaultLocale];
  return (key: string): string => t[key] || key;
}
