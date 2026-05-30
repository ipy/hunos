/** True when running inside the HarmonyOS ArkWeb shell (rawfile WebView). */
export function isHarmonyOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator.userAgent || "").includes("ArkWeb");
}

/** System UI sans stack for HarmonyOS (includes SC CJK glyphs). */
export const HARMONY_UI_SANS =
  '"HarmonyOS Sans SC", "HarmonyOS Sans", sans-serif';

/** System UI serif fallback on HarmonyOS. */
export const HARMONY_UI_SERIF = '"HarmonyOS Sans SC", "HarmonyOS Sans", serif';

/** System monospace stack for HarmonyOS. */
export const HARMONY_UI_MONO =
  '"HarmonyOS Sans Mono", "Droid Sans Mono", monospace';

/** CJK fallback appended to bundled Latin webfonts on HarmonyOS. */
export const HARMONY_CJK_FALLBACK = '"HarmonyOS Sans SC", "HarmonyOS Sans"';
