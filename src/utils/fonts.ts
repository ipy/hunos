import type { EditorFont } from "@/types/settings";
import {
  HARMONY_CJK_FALLBACK,
  HARMONY_UI_MONO,
  HARMONY_UI_SANS,
  HARMONY_UI_SERIF,
  isHarmonyOS,
} from "@/utils/platform";

export interface FontDef {
  id: string;
  label: string;
  family: string;
}

export const TEXT_FONTS: FontDef[] = [
  {
    id: "sans",
    label: "System Sans",
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: "serif",
    label: "Georgia",
    family: 'Georgia, Cambria, "Times New Roman", serif',
  },
  {
    id: "mono",
    label: "SF Mono",
    family: '"SF Mono", Menlo, Consolas, monospace',
  },
  { id: "inter", label: "Inter", family: '"Inter", sans-serif' },
  { id: "lora", label: "Lora", family: '"Lora", serif' },
  {
    id: "merriweather",
    label: "Merriweather",
    family: '"Merriweather", serif',
  },
  {
    id: "source-sans",
    label: "Source Sans 3",
    family: '"Source Sans 3", sans-serif',
  },
  { id: "noto-serif", label: "Noto Serif", family: '"Noto Serif", serif' },
  {
    id: "ibm-plex",
    label: "IBM Plex Sans",
    family: '"IBM Plex Sans", sans-serif',
  },
];

export const CODE_FONTS: FontDef[] = [
  {
    id: "mono",
    label: "SF Mono",
    family: '"SF Mono", Menlo, Consolas, monospace',
  },
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    family: '"JetBrains Mono", monospace',
  },
  { id: "fira-code", label: "Fira Code", family: '"Fira Code", monospace' },
  {
    id: "source-code",
    label: "Source Code Pro",
    family: '"Source Code Pro", monospace',
  },
];

const HARMONY_SYSTEM_TEXT: Record<string, string> = {
  sans: HARMONY_UI_SANS,
  serif: HARMONY_UI_SERIF,
  mono: HARMONY_UI_MONO,
};

const HARMONY_SYSTEM_CODE: Record<string, string> = {
  mono: HARMONY_UI_MONO,
};

/** Map a web font stack to HarmonyOS-aware fallbacks on ArkWeb. */
export function harmonizeFontFamily(family: string): string {
  if (!isHarmonyOS()) return family;
  if (family.includes("HarmonyOS")) return family;

  const webToHarmony: Record<string, string> = {
    [TEXT_FONTS[0].family]: HARMONY_UI_SANS,
    [TEXT_FONTS[1].family]: HARMONY_UI_SERIF,
    [TEXT_FONTS[2].family]: HARMONY_UI_MONO,
    [CODE_FONTS[0].family]: HARMONY_UI_MONO,
  };
  if (webToHarmony[family]) return webToHarmony[family];

  return family.replace(
    /,\s*(sans-serif|serif|monospace)\s*$/,
    `, ${HARMONY_CJK_FALLBACK}, $1`,
  );
}

export function resolveTextFontFamily(fontId: EditorFont): string {
  const found = TEXT_FONTS.find((f) => f.id === fontId);
  const family = found?.family ?? TEXT_FONTS[0].family;
  if (isHarmonyOS() && HARMONY_SYSTEM_TEXT[fontId]) {
    return HARMONY_SYSTEM_TEXT[fontId];
  }
  return harmonizeFontFamily(family);
}

export function resolveCodeFontFamily(fontId: EditorFont): string {
  const found = CODE_FONTS.find((f) => f.id === fontId);
  const family = found?.family ?? CODE_FONTS[0].family;
  if (isHarmonyOS() && HARMONY_SYSTEM_CODE[fontId]) {
    return HARMONY_SYSTEM_CODE[fontId];
  }
  return harmonizeFontFamily(family);
}
