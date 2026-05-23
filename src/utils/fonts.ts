import type { EditorFont } from '@/types/settings';

export interface FontDef {
  id: string;
  label: string;
  family: string;
  googleFont?: string;
}

export const TEXT_FONTS: FontDef[] = [
  { id: 'sans', label: 'System Sans', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', label: 'Georgia', family: 'Georgia, Cambria, "Times New Roman", serif' },
  { id: 'mono', label: 'SF Mono', family: '"SF Mono", Menlo, Consolas, monospace' },
  { id: 'inter', label: 'Inter', family: '"Inter", sans-serif', googleFont: 'Inter:wght@400;500;600;700' },
  { id: 'lora', label: 'Lora', family: '"Lora", serif', googleFont: 'Lora:wght@400;500;600;700' },
  { id: 'merriweather', label: 'Merriweather', family: '"Merriweather", serif', googleFont: 'Merriweather:wght@400;700' },
  { id: 'source-sans', label: 'Source Sans 3', family: '"Source Sans 3", sans-serif', googleFont: 'Source+Sans+3:wght@400;600;700' },
  { id: 'noto-serif', label: 'Noto Serif', family: '"Noto Serif", serif', googleFont: 'Noto+Serif:wght@400;700' },
  { id: 'ibm-plex', label: 'IBM Plex Sans', family: '"IBM Plex Sans", sans-serif', googleFont: 'IBM+Plex+Sans:wght@400;500;600;700' },
];

export const CODE_FONTS: FontDef[] = [
  { id: 'mono', label: 'SF Mono', family: '"SF Mono", Menlo, Consolas, monospace' },
  { id: 'jetbrains', label: 'JetBrains Mono', family: '"JetBrains Mono", monospace', googleFont: 'JetBrains+Mono:wght@400;500;700' },
  { id: 'fira-code', label: 'Fira Code', family: '"Fira Code", monospace', googleFont: 'Fira+Code:wght@400;500;700' },
  { id: 'source-code', label: 'Source Code Pro', family: '"Source Code Pro", monospace', googleFont: 'Source+Code+Pro:wght@400;500;700' },
];

export function resolveTextFontFamily(fontId: EditorFont): string {
  const found = TEXT_FONTS.find(f => f.id === fontId);
  return found?.family ?? TEXT_FONTS[0].family;
}

export function resolveCodeFontFamily(fontId: EditorFont): string {
  const found = CODE_FONTS.find(f => f.id === fontId);
  return found?.family ?? CODE_FONTS[0].family;
}

export function loadGoogleFont(font: string) {
  const id = `gf-${font.replace(/[^a-z0-9]/gi, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font}&display=swap`;
  document.head.appendChild(link);
}
