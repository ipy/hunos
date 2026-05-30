import { useState, useEffect } from "react";

export type LayoutMode = "mobile" | "tablet" | "desktop";

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

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
