import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/types/settings";

const settingsStorageGetAll = vi.fn();
const settingsStorageHas = vi.fn();
const settingsStorageSet = vi.fn().mockResolvedValue(undefined);
const bootstrapAppData = vi.fn().mockResolvedValue(undefined);
const flushEditorAutosave = vi.fn().mockResolvedValue(null);
const clearStashedEditorAutosave = vi.fn();
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
    has: (...args: unknown[]) => settingsStorageHas(...args),
    set: (...args: unknown[]) => settingsStorageSet(...args),
  },
}));

vi.mock("@/app/bootstrapAppData", () => ({
  bootstrapAppData: (...args: unknown[]) => bootstrapAppData(...args),
}));

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosave: () => flushEditorAutosave(),
  clearStashedEditorAutosave: () => clearStashedEditorAutosave(),
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
    writeLocaleToUrl: (...args: unknown[]) => writeLocaleToUrl(...args),
  };
});

describe("useSettingsStore", () => {
  beforeEach(async () => {
    vi.resetModules();
    settingsStorageGetAll.mockReset();
    settingsStorageHas.mockReset();
    settingsStorageSet.mockClear();
    flushEditorAutosave.mockClear();
    clearStashedEditorAutosave.mockClear();
    bootstrapAppData.mockClear();
    syncFormatPlaygroundOnLocaleChange.mockClear();
    writeLocaleToUrl.mockClear();
    showToast.mockClear();
    settingsStorageGetAll.mockResolvedValue({ ...DEFAULT_SETTINGS });
    settingsStorageHas.mockResolvedValue(true);
  });

  it("setLocale flushes, migrates playground, persists, and updates URL", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({ locale: "zh" });

    await useSettingsStore.getState().setLocale("en");

    expect(flushEditorAutosave).toHaveBeenCalled();
    expect(syncFormatPlaygroundOnLocaleChange).toHaveBeenCalledWith(
      "en",
      null,
      {
        focusCanonical: true,
      },
    );
    expect(settingsStorageSet).toHaveBeenCalledWith("locale", "en");
    expect(writeLocaleToUrl).toHaveBeenCalledWith("en");
    expect(useSettingsStore.getState().locale).toBe("en");
    expect(showToast).not.toHaveBeenCalled();
    expect(clearStashedEditorAutosave).toHaveBeenCalled();
  });

  it("setLocale syncs playground when locale unchanged but editor flush is pending", async () => {
    syncFormatPlaygroundOnLocaleChange.mockResolvedValue({
      canonicalNoteId: "pg-zh",
      switchedFromNoteId: "pg-en",
      flushDropped: true,
    });
    flushEditorAutosave.mockResolvedValue('{"type":"doc"}');

    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({ locale: "zh" });

    await useSettingsStore.getState().setLocale("zh");

    expect(syncFormatPlaygroundOnLocaleChange).toHaveBeenCalledWith(
      "zh",
      '{"type":"doc"}',
      {
        focusCanonical: true,
      },
    );
    expect(showToast).toHaveBeenCalledWith(
      "settings.language.playgroundFlushDropped:zh",
    );
    expect(settingsStorageSet).not.toHaveBeenCalledWith("locale", "zh");
    expect(writeLocaleToUrl).not.toHaveBeenCalled();
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
    settingsStorageGetAll.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      locale: "zh",
    });

    const { useSettingsStore } = await import("./settingsStore");
    await useSettingsStore.getState().loadSettings();

    expect(bootstrapAppData).toHaveBeenCalledWith("zh");
    expect(useSettingsStore.getState().isLoaded).toBe(true);
  });

  it("loadSettings uses zh on ArkWeb first launch without URL locale", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 ArkWeb/1.0" });
    vi.stubGlobal("window", {
      location: { search: "" },
    });
    settingsStorageGetAll.mockResolvedValue({ ...DEFAULT_SETTINGS });
    settingsStorageHas.mockResolvedValue(false);

    const { useSettingsStore } = await import("./settingsStore");
    await useSettingsStore.getState().loadSettings();

    expect(bootstrapAppData).toHaveBeenCalledWith("zh");
    expect(settingsStorageSet).toHaveBeenCalledWith("locale", "zh");
    expect(useSettingsStore.getState().locale).toBe("zh");
    vi.unstubAllGlobals();
  });

  it("loadSettings keeps stored en on ArkWeb when locale was persisted", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 ArkWeb/1.0" });
    vi.stubGlobal("window", {
      location: { search: "" },
    });
    settingsStorageGetAll.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      locale: "en",
    });
    settingsStorageHas.mockResolvedValue(true);

    const { useSettingsStore } = await import("./settingsStore");
    await useSettingsStore.getState().loadSettings();

    expect(bootstrapAppData).toHaveBeenCalledWith("en");
    expect(settingsStorageSet).not.toHaveBeenCalledWith("locale", "zh");
    vi.unstubAllGlobals();
  });

  it("loadSettings dedupes concurrent bootstrap calls", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Chrome/120.0" });
    vi.stubGlobal("window", {
      location: { search: "?lang=en" },
    });
    settingsStorageGetAll.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      locale: "zh",
    });
    settingsStorageHas.mockResolvedValue(true);

    const { useSettingsStore } = await import("./settingsStore");
    await Promise.all([
      useSettingsStore.getState().loadSettings(),
      useSettingsStore.getState().loadSettings(),
    ]);

    expect(bootstrapAppData).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("loadSettings honors ?lang=en on web", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Chrome/120.0" });
    vi.stubGlobal("window", {
      location: { search: "?lang=en" },
    });
    settingsStorageGetAll.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      locale: "zh",
    });
    settingsStorageHas.mockResolvedValue(true);

    const { useSettingsStore } = await import("./settingsStore");
    await useSettingsStore.getState().loadSettings();

    expect(bootstrapAppData).toHaveBeenCalledWith("en");
    expect(settingsStorageSet).toHaveBeenCalledWith("locale", "en");
    vi.unstubAllGlobals();
  });
});
