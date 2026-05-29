export type ThemeMode = "light" | "dark" | "system";
export type Locale = "en" | "es" | "zh";
export type EditorFont = string;
export type SortBy = "modifiedAt" | "createdAt" | "title";
export type SortOrder = "asc" | "desc";

export interface AppSettings {
  theme: ThemeMode;
  locale: Locale;
  editorFont: EditorFont;
  headingsFont: EditorFont;
  codeFont: EditorFont;
  fontSize: number;
  lineHeight: number;
  lineWidth: number;
  paragraphSpacing: number;
  paragraphIndent: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  hideCompletedTasks: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  locale: "en",
  editorFont: "sans",
  headingsFont: "sans",
  codeFont: "mono",
  fontSize: 16,
  lineHeight: 1.5,
  lineWidth: 48,
  paragraphSpacing: 0,
  paragraphIndent: 0,
  sortBy: "modifiedAt",
  sortOrder: "desc",
  hideCompletedTasks: false,
};
