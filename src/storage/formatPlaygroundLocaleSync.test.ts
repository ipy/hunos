import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYGROUND_SAMPLE_IMAGE_SRC } from "@/components/editor/imageEmbedUtils";
import {
  PLAYGROUND_CONTENT_VERSION,
  buildPlaygroundContent,
  pickFormatPlaygroundNote,
  syncFormatPlaygroundOnLocaleChange,
} from "./formatPlaygroundNote";

const mockNoteStoreState = vi.hoisted(() => {
  const saveNoteContent = vi.fn().mockResolvedValue(undefined);
  const saveNoteTitle = vi.fn().mockResolvedValue(undefined);
  return {
    activeNoteId: "pg-1" as string | null,
    notes: [] as Array<{ id: string; title: string; content: string }>,
    saveNoteContent,
    saveNoteTitle,
  };
});

const saveNoteContent = mockNoteStoreState.saveNoteContent;
const saveNoteTitle = mockNoteStoreState.saveNoteTitle;

const noteStorageList = vi.fn();

function playgroundContentWithVersion(
  locale: "en" | "zh",
  version: number,
): string {
  const doc = buildPlaygroundContent(locale) as {
    type: "doc";
    attrs?: Record<string, unknown>;
    content: unknown[];
  };
  doc.attrs = {
    ...doc.attrs,
    playgroundContentVersion: version,
  };
  return JSON.stringify(doc);
}

function duplicatePlaygroundPair() {
  return [
    {
      id: "pg-en",
      title: "Format Playground",
      content: JSON.stringify(buildPlaygroundContent("en")),
      isPinned: false,
      modifiedAt: 100,
    },
    {
      id: "pg-zh",
      title: "格式试炼场",
      content: playgroundContentWithVersion("en", PLAYGROUND_CONTENT_VERSION),
      isPinned: false,
      modifiedAt: 200,
    },
  ];
}

vi.mock("@/store/noteStore", () => ({
  useNoteStore: {
    getState: () => mockNoteStoreState,
  },
}));

vi.mock("./noteStorage", () => ({
  noteStorage: {
    list: (...args: unknown[]) => noteStorageList(...args),
  },
}));

describe("syncFormatPlaygroundOnLocaleChange", () => {
  beforeEach(() => {
    saveNoteContent.mockClear();
    saveNoteTitle.mockClear();
    noteStorageList.mockReset();
    mockNoteStoreState.activeNoteId = "pg-1";
    mockNoteStoreState.notes = [
      {
        id: "pg-1",
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
      },
    ];
  });

  it("migrates active playground using flushed editor JSON", async () => {
    const zh = buildPlaygroundContent("zh") as {
      content: Array<{
        type: string;
        attrs?: { src?: string; height?: number };
        content?: Array<{ text?: string }>;
      }>;
    };
    const imagesIndex = zh.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "图片",
    );
    const imageNode = zh.content[imagesIndex + 2];
    if (imageNode?.attrs) {
      imageNode.attrs.height = 240;
    }
    const flushed = JSON.stringify(zh);

    await syncFormatPlaygroundOnLocaleChange("en", flushed);

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(saveNoteContent.mock.calls[0][1] as string) as {
      attrs?: { playgroundContentLocale?: string };
      content: Array<{
        type: string;
        attrs?: { src?: string; height?: number };
        content?: Array<{ text?: string }>;
      }>;
    };
    expect(saved.attrs?.playgroundContentLocale).toBe("en");
    const imagesSection = saved.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    const migratedImage = saved.content[imagesSection + 2];
    expect(migratedImage?.attrs?.height).toBe(240);
    expect(migratedImage?.attrs?.src).toBe(PLAYGROUND_SAMPLE_IMAGE_SRC);
    expect(saveNoteTitle).toHaveBeenCalledWith("pg-1", "Format Playground");
  });

  it("no-ops when flushed content is already current for locale", async () => {
    const content = JSON.stringify(buildPlaygroundContent("zh"));
    await syncFormatPlaygroundOnLocaleChange("zh", content);
    expect(saveNoteContent).not.toHaveBeenCalled();
    expect(saveNoteTitle).not.toHaveBeenCalled();
  });

  it("migrates playground from storage on cold load without activeNoteId", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue([
      {
        id: "pg-1",
        title: "Format Playground",
        content: JSON.stringify(buildPlaygroundContent("en")),
      },
    ]);

    await syncFormatPlaygroundOnLocaleChange("zh");

    expect(noteStorageList).toHaveBeenCalled();
    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(saveNoteContent.mock.calls[0][1] as string) as {
      attrs?: { playgroundContentLocale?: string };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(saved.attrs?.playgroundContentLocale).toBe("zh");
    const imagesSection = saved.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "图片",
    );
    expect(imagesSection).toBeGreaterThan(-1);
    expect(saveNoteTitle).toHaveBeenCalledWith("pg-1", "格式试炼场");
  });

  it("prefers canonical playground title when another note has playground attrs", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue([
      {
        id: "welcome-1",
        title: "欢迎使用 Hunos",
        content: JSON.stringify(buildPlaygroundContent("zh")),
      },
      {
        id: "pg-1",
        title: "Format Playground",
        content: JSON.stringify(buildPlaygroundContent("en")),
      },
    ]);

    await syncFormatPlaygroundOnLocaleChange("zh");

    expect(saveNoteTitle).toHaveBeenCalledWith("pg-1", "格式试炼场");
    expect(saveNoteTitle).not.toHaveBeenCalledWith("welcome-1", expect.anything());
  });

  it("prefers zh-titled playground when syncing zh locale with duplicate canonical notes", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue(duplicatePlaygroundPair());

    await syncFormatPlaygroundOnLocaleChange("zh");

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith(
      "pg-zh",
      expect.any(String),
    );
    expect(saveNoteContent).not.toHaveBeenCalledWith("pg-en", expect.anything());
  });

  it("prefers en-titled playground when syncing en locale with duplicate canonical notes", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue([
      {
        id: "pg-zh",
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
        isPinned: false,
        modifiedAt: 200,
      },
      {
        id: "pg-en",
        title: "Format Playground",
        content: playgroundContentWithVersion("zh", PLAYGROUND_CONTENT_VERSION),
        isPinned: false,
        modifiedAt: 100,
      },
    ]);

    await syncFormatPlaygroundOnLocaleChange("en");

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith(
      "pg-en",
      expect.any(String),
    );
    expect(saveNoteContent).not.toHaveBeenCalledWith("pg-zh", expect.anything());
  });

  it("prefers pinned attr-match playground when neither title is canonical", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue([
      {
        id: "pg-unpinned",
        title: "Playground Copy A",
        content: playgroundContentWithVersion("en", PLAYGROUND_CONTENT_VERSION),
        isPinned: false,
        modifiedAt: 300,
      },
      {
        id: "pg-pinned",
        title: "Playground Copy B",
        content: playgroundContentWithVersion("en", 18),
        isPinned: true,
        modifiedAt: 100,
      },
    ]);

    await syncFormatPlaygroundOnLocaleChange("zh");

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith(
      "pg-pinned",
      expect.any(String),
    );
    expect(saveNoteContent).not.toHaveBeenCalledWith(
      "pg-unpinned",
      expect.anything(),
    );
  });

  it("prefers highest playgroundContentVersion among unpinned attr-match notes", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue([
      {
        id: "pg-v18",
        title: "Playground Copy Old",
        content: playgroundContentWithVersion("en", 18),
        isPinned: false,
        modifiedAt: 300,
      },
      {
        id: "pg-v20",
        title: "Playground Copy New",
        content: playgroundContentWithVersion("en", PLAYGROUND_CONTENT_VERSION),
        isPinned: false,
        modifiedAt: 100,
      },
    ]);

    await syncFormatPlaygroundOnLocaleChange("zh");

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith("pg-v20", expect.any(String));
    expect(saveNoteContent).not.toHaveBeenCalledWith(
      "pg-v18",
      expect.anything(),
    );
  });
});

describe("pickFormatPlaygroundNote", () => {
  it("returns locale-matching canonical title over the other canonical duplicate", () => {
    const picked = pickFormatPlaygroundNote(duplicatePlaygroundPair(), "zh");
    expect(picked?.id).toBe("pg-zh");

    const pickedEn = pickFormatPlaygroundNote(duplicatePlaygroundPair(), "en");
    expect(pickedEn?.id).toBe("pg-en");
  });
});
