import type { Locale } from "@/types/settings";

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
