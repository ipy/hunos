export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

import {
  HARMONY_UI_MONO,
  HARMONY_UI_SANS,
  HARMONY_UI_SERIF,
  isHarmonyOS,
} from "@/utils/platform";

export interface UIFontFamily {
  sans: string;
  serif: string;
  mono: string;
}

const WEB_FONT_FAMILY: UIFontFamily = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: '"SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};

const HARMONY_FONT_FAMILY: UIFontFamily = {
  sans: HARMONY_UI_SANS,
  serif: HARMONY_UI_SERIF,
  mono: HARMONY_UI_MONO,
};

export function getUIFontFamily(): UIFontFamily {
  return isHarmonyOS() ? HARMONY_FONT_FAMILY : WEB_FONT_FAMILY;
}

/** @deprecated Prefer getUIFontFamily() for platform-aware UI chrome fonts. */
export const fontFamily = WEB_FONT_FAMILY;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentLight: string;
  highlight: string;
  accentText: string;
  border: string;
  borderLight: string;
  danger: string;
  dangerLight: string;
  success: string;
  shadow: string;
}

export interface Theme {
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  fontFamily: UIFontFamily;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  isDark: boolean;
}
