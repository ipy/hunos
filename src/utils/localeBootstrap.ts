import type { Locale } from "@/types/settings";
import { isHarmonyOS } from "@/utils/platform";

/** Canonical `?lang=` values written when locale changes in Settings. */
const LOCALE_URL_PARAMS: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
  es: "es",
};

/** Map a `?lang=` query value to an app locale (e.g. zh-CN → zh). */
export function parseLocaleFromUrlParam(lang: string | null): Locale | null {
  if (!lang) return null;
  const normalized = lang.trim().toLowerCase().replace(/_/g, "-");
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("en")) return "en";
  return null;
}

export function readLocaleFromUrl(): Locale | null {
  if (typeof window === "undefined") return null;
  return parseLocaleFromUrlParam(
    new URLSearchParams(window.location.search).get("lang"),
  );
}

/** Locale for first bootstrap: URL wins, then Harmony first-launch zh, else stored. */
export function resolveBootstrapLocale(
  storedLocale: Locale,
  hasStoredLocale: boolean,
): Locale {
  const urlLocale = readLocaleFromUrl();
  if (urlLocale) return urlLocale;
  if (isHarmonyOS() && !hasStoredLocale) return "zh";
  return storedLocale;
}

export function localeToUrlParam(locale: Locale): string {
  return LOCALE_URL_PARAMS[locale];
}

/** Keep the address bar in sync with the in-app locale (bookmarks / reload). */
export function writeLocaleToUrl(locale: Locale): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", localeToUrlParam(locale));
  window.history.replaceState(null, "", url.toString());
}
