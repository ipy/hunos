import type { Locale } from "@/types/settings";
import {
  extractFromPlainText,
  extractPlainTextFromTiptap,
} from "@/graph/linkExtractor";
import {
  buildPlaygroundContent,
  getFormatPlaygroundTitle,
} from "./formatPlaygroundNote";
import { getWelcomeSeed } from "./welcomeNotes";

/** Canonical welcome note JSON for the bootstrap locale — tag reconcile SSOT. */
export function getBootstrapWelcomeSeedContent(locale: Locale): string {
  return JSON.stringify(getWelcomeSeed(locale).content);
}

/** Canonical format playground JSON for the bootstrap locale — tag reconcile SSOT. */
export function getBootstrapPlaygroundSeedContent(locale: Locale): string {
  return JSON.stringify(buildPlaygroundContent(locale));
}

export function getBootstrapWelcomeTitle(locale: Locale): string {
  return getWelcomeSeed(locale).title;
}

export { getFormatPlaygroundTitle };

/** Tag names implied by locale seed notes (including intermediate parents). */
export function getBootstrapSeedTagNames(locale: Locale): string[] {
  const welcome = getWelcomeSeed(locale);
  const playground = buildPlaygroundContent(locale);
  const names = new Set<string>();
  for (const source of [welcome.content, playground]) {
    for (const tag of extractFromPlainText(extractPlainTextFromTiptap(source))
      .tags) {
      names.add(tag.name);
      if (tag.name.includes("/")) {
        names.add(tag.name.split("/").slice(0, -1).join("/"));
      }
    }
  }
  return [...names].sort();
}
