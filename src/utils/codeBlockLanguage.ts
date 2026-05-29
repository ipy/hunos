/** Normalize fence language tags to registered lowlight grammar ids. */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  html: "html",
};

export function normalizeCodeBlockLanguage(
  language: string | null | undefined,
): string | null {
  if (!language) return null;
  const trimmed = language.trim().toLowerCase();
  if (!trimmed) return null;
  return LANGUAGE_ALIASES[trimmed] ?? trimmed;
}
