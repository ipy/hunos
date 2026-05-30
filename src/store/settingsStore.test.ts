import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/types/settings";

const settingsStorageGetAll = vi.fn();
const settingsStorageSet = vi.fn().mockResolvedValue(undefined);
const bootstrapAppData = vi.fn().mockResolvedValue(undefined);
const flushEditorAutosave = vi.fn().mockResolvedValue(null);
const syncFormatPlaygroundOnLocaleChange = vi.fn().mockResolvedValue({
  canonicalNoteId: null,
  switchedFromNoteId: null,
  flushDropped: false,
});
const writeLocaleToUrl = vi.fn();
const showToast = vi.fn();

vi.mock("@/store/uiStore", () => ({
  useUIStore: {
    getState: () => ({ showToast }),
  },
}));

vi.mock("@/i18n", () => ({
  default: {
    t: (key: string, options?: { lng?: string }) =>
      `${key}:${options?.lng ?? "en"}`,
  },
}));

vi.mock("@/storage/settingsStorage", () => ({
  settingsStorage: {
    getAll: () => settingsStorageGetAll(),
    set: (...args: unknown[]) => settingsStorageSet(...args),
  },
}));

vi.mock("@/app/bootstrapAppData", () => ({
  bootstrapAppData: (...args: unknown[]) => bootstrapAppData(...args),
}));

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosave: () => flushEditorAutosave(),
}));

vi.mock("@/storage/formatPlaygroundNote", () => ({
  syncFormatPlaygroundOnLocaleChange: (...args: unknown[]) =>
    syncFormatPlaygroundOnLocaleChange(...args),
}));

vi.mock("@/utils/localeBootstrap", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/localeBootstrap")>();
  return {
    ...actual,
    readLocaleFromUrl: vi.fn(() => null),
    writeLocaleToUrl: (...args: unknown[]) => writeLocaleToUrl(...args),
  };
});

describe("useSettingsStore", () => {
  beforeEach(async () => {
    vi.resetModules();
    settingsStorageGetAll.mockReset();
    settingsStorageSet.mockClear();
    flushEditorAutosave.mockClear();
    bootstrapAppData.mockClear();
    syncFormatPlaygroundOnLocaleChange.mockClear();
    writeLocaleToUrl.mockClear();
    showToast.mockClear();
    settingsStorageGetAll.mockResolvedValue({ ...DEFAULT_SETTINGS });
  });

  it("setLocale flushes, migrates playground, persists, and updates URL", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({ locale: "zh" });

    await useSettingsStore.getState().setLocale("en");

    expect(flushEditorAutosave).toHaveBeenCalled();
    expect(syncFormatPlaygroundOnLocaleChange).toHaveBeenCalledWith("en", null, {
      focusCanonical: true,
    });
    expect(settingsStorageSet).toHaveBeenCalledWith("locale", "en");
    expect(writeLocaleToUrl).toHaveBeenCalledWith("en");
    expect(useSettingsStore.getState().locale).toBe("en");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("setLocale shows toast when playground flush is dropped on wrong duplicate", async () => {
    syncFormatPlaygroundOnLocaleChange.mockResolvedValue({
      canonicalNoteId: "pg-zh",
      switchedFromNoteId: "pg-en",
      flushDropped: true,
    });
    flushEditorAutosave.mockResolvedValue('{"type":"doc"}');

    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({ locale: "en" });

    await useSettingsStore.getState().setLocale("zh");

    expect(showToast).toHaveBeenCalledWith(
      "settings.language.playgroundFlushDropped:zh",
    );
  });

  it("loadSettings bootstraps app data before marking loaded", async () => {
    const { readLocaleFromUrl } = await import("@/utils/localeBootstrap");
    vi.mocked(readLocaleFromUrl).mockReturnValue("zh");
    settingsStorageGetAll.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      locale: "zh",
    });

    const { useSettingsStore } = await import("./settingsStore");
    await useSettingsStore.getState().loadSettings();

    expect(bootstrapAppData).toHaveBeenCalledWith("zh");
    expect(useSettingsStore.getState().isLoaded).toBe(true);
  });
});
