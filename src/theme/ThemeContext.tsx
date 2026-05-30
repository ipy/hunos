import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
} from "react";
import type { Theme } from "./tokens";
import {
  spacing,
  radius,
  getUIFontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from "./tokens";
import { lightColors } from "./light";
import { darkColors } from "./dark";
import type { ThemeMode } from "@/types/settings";

const ThemeContext = createContext<Theme | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(mode: ThemeMode): Theme {
  const resolvedMode = mode === "system" ? getSystemTheme() : mode;
  const isDark = resolvedMode === "dark";
  return {
    colors: isDark ? darkColors : lightColors,
    spacing,
    radius,
    fontFamily: getUIFontFamily(),
    fontSize,
    fontWeight,
    lineHeight,
    isDark,
  };
}

interface ThemeProviderProps {
  mode: ThemeMode;
  children: React.ReactNode;
}

export function ThemeProvider({ mode, children }: ThemeProviderProps) {
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const theme = useMemo(() => {
    const resolvedMode = mode === "system" ? systemTheme : mode;
    const isDark = resolvedMode === "dark";
    return {
      colors: isDark ? darkColors : lightColors,
      spacing,
      radius,
      fontFamily: getUIFontFamily(),
      fontSize,
      fontWeight,
      lineHeight,
      isDark,
    };
  }, [mode, systemTheme]);

  useEffect(() => {
    document.documentElement.style.backgroundColor = theme.colors.background;
    document.documentElement.style.color = theme.colors.text;
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used within ThemeProvider");
  return theme;
}
