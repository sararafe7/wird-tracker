export const locales = ["ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";
export const rtlLocales: Locale[] = ["ar"];

export function getLangFromUrl(url: URL): Locale {
  const seg = url.pathname.split("/")[1];
  if (locales.includes(seg as Locale)) return seg as Locale;
  return defaultLocale;
}

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

export function getTranslatedPath(path: string, locale: Locale): string {
  const clean = path.replace(/^\/(ar|en)/, "");
  return `/${locale}${clean || "/"}`;
}
