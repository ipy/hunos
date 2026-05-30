import { create } from "zustand";
import type {
  AppSettings,
  ThemeMode,
  Locale,
  EditorFont,
  SortBy,
  SortOrder,
} from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { settingsStorage } from "@/storage/settingsStorage";
import { bootstrapAppData } from "@/app/bootstrapAppData";
import { syncFormatPlaygroundOnLocaleChange } from "@/storage/formatPlaygroundNote";
import {
  clearStashedEditorAutosave,
  flushEditorAutosave,
} from "@/store/editorAutosaveRegistry";
import { useUIStore } from "@/store/uiStore";
import {
  resolveBootstrapLocale,
  writeLocaleToUrl,
} from "@/utils/localeBootstrap";
import i18n from "@/i18n";

let loadSettingsInflight: Promise<void> | null = null;

interface SettingsStore extends AppSettings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  setEditorFont: (font: EditorFont) => Promise<void>;
  setHeadingsFont: (font: EditorFont) => Promise<void>;
  setCodeFont: (font: EditorFont) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setLineHeight: (val: number) => Promise<void>;
  setLineWidth: (val: number) => Promise<void>;
  setParagraphSpacing: (val: number) => Promise<void>;
  setParagraphIndent: (val: number) => Promise<void>;
  setSortBy: (sortBy: SortBy) => Promise<void>;
  setSortOrder: (order: SortOrder) => Promise<void>;
  setHideCompletedTasks: (hide: boolean) => Promise<void>;
  resetTypography: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    if (get().isLoaded) {
      return;
    }
    if (loadSettingsInflight) {
      return loadSettingsInflight;
    }

    loadSettingsInflight = (async () => {
      const settings = await settingsStorage.getAll();
      const hasStoredLocale = await settingsStorage.has("locale");
      const effectiveLocale = resolveBootstrapLocale(
        settings.locale,
        hasStoredLocale,
      );

      if (effectiveLocale !== settings.locale) {
        await settingsStorage.set("locale", effectiveLocale);
        settings.locale = effectiveLocale;
      }

      await bootstrapAppData(effectiveLocale);

      set({ ...settings, isLoaded: true });
    })().finally(() => {
      loadSettingsInflight = null;
    });

    return loadSettingsInflight;
  },

  setTheme: async (theme) => {
    await settingsStorage.set("theme", theme);
    set({ theme });
  },

  setLocale: async (locale) => {
    const current = get().locale;
    const flushedContent = await flushEditorAutosave();

    const syncResult = await syncFormatPlaygroundOnLocaleChange(
      locale,
      flushedContent,
      { focusCanonical: true },
    );
    clearStashedEditorAutosave();

    if (syncResult.flushDropped) {
      useUIStore
        .getState()
        .showToast(
          i18n.t("settings.language.playgroundFlushDropped", { lng: locale }),
        );
    }

    if (current === locale) {
      return;
    }

    await settingsStorage.set("locale", locale);
    writeLocaleToUrl(locale);
    set({ locale });
  },

  setEditorFont: async (editorFont) => {
    await settingsStorage.set("editorFont", editorFont);
    set({ editorFont });
  },

  setHeadingsFont: async (headingsFont) => {
    await settingsStorage.set("headingsFont", headingsFont);
    set({ headingsFont });
  },

  setCodeFont: async (codeFont) => {
    await settingsStorage.set("codeFont", codeFont);
    set({ codeFont });
  },

  setFontSize: async (fontSize) => {
    await settingsStorage.set("fontSize", fontSize);
    set({ fontSize });
  },

  setLineHeight: async (lineHeight) => {
    await settingsStorage.set("lineHeight", lineHeight);
    set({ lineHeight });
  },

  setLineWidth: async (lineWidth) => {
    await settingsStorage.set("lineWidth", lineWidth);
    set({ lineWidth });
  },

  setParagraphSpacing: async (paragraphSpacing) => {
    await settingsStorage.set("paragraphSpacing", paragraphSpacing);
    set({ paragraphSpacing });
  },

  setParagraphIndent: async (paragraphIndent) => {
    await settingsStorage.set("paragraphIndent", paragraphIndent);
    set({ paragraphIndent });
  },

  setSortBy: async (sortBy) => {
    await settingsStorage.set("sortBy", sortBy);
    set({ sortBy });
  },

  setSortOrder: async (sortOrder) => {
    await settingsStorage.set("sortOrder", sortOrder);
    set({ sortOrder });
  },

  setHideCompletedTasks: async (hideCompletedTasks) => {
    await settingsStorage.set("hideCompletedTasks", hideCompletedTasks);
    set({ hideCompletedTasks });
  },

  resetTypography: async () => {
    const defaults = {
      editorFont: DEFAULT_SETTINGS.editorFont,
      headingsFont: DEFAULT_SETTINGS.headingsFont,
      codeFont: DEFAULT_SETTINGS.codeFont,
      fontSize: DEFAULT_SETTINGS.fontSize,
      lineHeight: DEFAULT_SETTINGS.lineHeight,
      lineWidth: DEFAULT_SETTINGS.lineWidth,
      paragraphSpacing: DEFAULT_SETTINGS.paragraphSpacing,
      paragraphIndent: DEFAULT_SETTINGS.paragraphIndent,
    };
    for (const [key, value] of Object.entries(defaults)) {
      await settingsStorage.set(key as keyof AppSettings, value as never);
    }
    set(defaults);
  },
}));
