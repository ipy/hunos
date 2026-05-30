/** CustomEvent type dispatched from Harmony native onBackground via runJavaScript. */
export const HUNOS_LIFECYCLE_HIDE_EVENT = "hunos:lifecycle-hide";

/** Script injected by harmony/entry WebLifecycleBridge.notifyBackground(). */
export const HUNOS_LIFECYCLE_HIDE_SCRIPT =
  `void window.dispatchEvent(new CustomEvent("${HUNOS_LIFECYCLE_HIDE_EVENT}"));`;

/** Test/dev harness: simulate native background without runJavaScript. */
export function dispatchHarmonyLifecycleHide(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HUNOS_LIFECYCLE_HIDE_EVENT));
}
