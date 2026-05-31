import { useState, useEffect } from "react";
import { isHarmonyOS } from "@/utils/platform";

export type LayoutMode = "mobile" | "tablet" | "desktop";

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

/** Floating B/I/U bubble only on wide desktop; mobile/tablet use bottom toolbar. */
export const FLOATING_TOOLBAR_MIN_WIDTH = 1280;

function isNativeMobileRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

export function isFloatingSelectionToolbarVisible(): boolean {
  if (typeof window === "undefined") return false;
  if (isHarmonyOS() || isNativeMobileRuntime()) return false;
  return window.innerWidth >= FLOATING_TOOLBAR_MIN_WIDTH;
}

export function getLayoutMode(width: number): LayoutMode {
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}

export function isMobileViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    getLayoutMode(window.innerWidth) === "mobile"
  );
}

export function useAdaptiveLayout(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(() =>
    getLayoutMode(typeof window !== "undefined" ? window.innerWidth : 375),
  );

  useEffect(() => {
    const handler = () => setMode(getLayoutMode(window.innerWidth));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return mode;
}
