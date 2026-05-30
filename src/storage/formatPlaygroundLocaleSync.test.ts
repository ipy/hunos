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
  const setActiveNote = vi.fn((id: string | null) => {
    mockNoteStoreState.activeNoteId = id;
  });
  return {
    activeNoteId: "pg-1" as string | null,
    notes: [] as Array<{ id: string; title: string; content: string }>,
    saveNoteContent,
    saveNoteTitle,
    setActiveNote,
  };
});

const saveNoteContent = mockNoteStoreState.saveNoteContent;
const saveNoteTitle = mockNoteStoreState.saveNoteTitle;
const setActiveNote = mockNoteStoreState.setActiveNote;

const noteStorageList = vi.fn();
const noteStorageGet = vi.fn();

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
    get: (...args: unknown[]) => noteStorageGet(...args),
  },
}));

describe("syncFormatPlaygroundOnLocaleChange", () => {
  beforeEach(() => {
    saveNoteContent.mockClear();
    saveNoteTitle.mockClear();
    setActiveNote.mockClear();
    noteStorageList.mockReset();
    noteStorageGet.mockReset();
    noteStorageGet.mockResolvedValue(undefined);
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

  it("retitles playground to match seed content locale not app locale label", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue([
      {
        id: "pg-en",
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("en")),
      },
    ]);

    await syncFormatPlaygroundOnLocaleChange("en");

    expect(saveNoteContent).not.toHaveBeenCalled();
    expect(saveNoteTitle).toHaveBeenCalledWith("pg-en", "Format Playground");
    expect(saveNoteTitle).not.toHaveBeenCalledWith("pg-en", "格式试炼场");
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
    expect(saveNoteTitle).not.toHaveBeenCalledWith(
      "welcome-1",
      expect.anything(),
    );
  });

  it("prefers zh-titled playground when syncing zh locale with duplicate canonical notes", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue(duplicatePlaygroundPair());

    await syncFormatPlaygroundOnLocaleChange("zh");

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith("pg-zh", expect.any(String));
    expect(saveNoteContent).not.toHaveBeenCalledWith(
      "pg-en",
      expect.anything(),
    );
  });

  it("syncs zh canonical when active EN duplicate is open", async () => {
    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = duplicatePlaygroundPair();

    await syncFormatPlaygroundOnLocaleChange("zh");

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith("pg-zh", expect.any(String));
    expect(saveNoteContent).not.toHaveBeenCalledWith(
      "pg-en",
      expect.anything(),
    );
    expect(saveNoteTitle).not.toHaveBeenCalledWith("pg-en", "格式试炼场");
  });

  it("syncs en canonical when active zh duplicate is open", async () => {
    mockNoteStoreState.activeNoteId = "pg-zh";
    mockNoteStoreState.notes = [
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
    ];

    await syncFormatPlaygroundOnLocaleChange("en");

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith("pg-en", expect.any(String));
    expect(saveNoteContent).not.toHaveBeenCalledWith(
      "pg-zh",
      expect.anything(),
    );
    expect(saveNoteTitle).not.toHaveBeenCalledWith("pg-zh", expect.anything());
    expect(saveNoteTitle).not.toHaveBeenCalledWith(
      "pg-zh",
      "Format Playground",
    );
  });

  it("applies flushed editor JSON only when active note is the picked canonical", async () => {
    const enDoc = buildPlaygroundContent("en") as {
      content: Array<{
        type: string;
        attrs?: { height?: number };
        content?: Array<{ text?: string }>;
      }>;
    };
    const imagesIndex = enDoc.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    const imageNode = enDoc.content[imagesIndex + 2];
    if (imageNode?.attrs) {
      imageNode.attrs.height = 180;
    }
    const flushed = JSON.stringify(enDoc);

    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = duplicatePlaygroundPair();

    await syncFormatPlaygroundOnLocaleChange("zh", flushed);

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith("pg-zh", expect.any(String));
    const saved = JSON.parse(saveNoteContent.mock.calls[0][1] as string) as {
      content: Array<{ attrs?: { height?: number } }>;
    };
    const savedImage = saved.content.find((n) => n.attrs?.height != null);
    expect(savedImage?.attrs?.height).toBe(180);
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
    expect(saveNoteContent).toHaveBeenCalledWith("pg-en", expect.any(String));
    expect(saveNoteContent).not.toHaveBeenCalledWith(
      "pg-zh",
      expect.anything(),
    );
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

  it("focuses locale-canonical playground when wrong duplicate is open", async () => {
    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = duplicatePlaygroundPair();

    const result = await syncFormatPlaygroundOnLocaleChange("zh", null, {
      focusCanonical: true,
    });

    expect(setActiveNote).toHaveBeenCalledWith("pg-zh");
    expect(result.switchedFromNoteId).toBe("pg-en");
    expect(result.canonicalNoteId).toBe("pg-zh");
  });

  it("focuses canonical playground when active duplicate is absent from store slice", async () => {
    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = [
      {
        id: "pg-zh",
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
        isPinned: false,
        modifiedAt: 200,
      },
    ];
    noteStorageGet.mockResolvedValue({
      id: "pg-en",
      title: "Format Playground",
      content: JSON.stringify(buildPlaygroundContent("en")),
    });

    const result = await syncFormatPlaygroundOnLocaleChange("zh", null, {
      focusCanonical: true,
    });

    expect(noteStorageGet).toHaveBeenCalledWith("pg-en");
    expect(setActiveNote).toHaveBeenCalledWith("pg-zh");
    expect(result.switchedFromNoteId).toBe("pg-en");
    expect(result.canonicalNoteId).toBe("pg-zh");
  });

  it("focuses canonical playground from flushed editor JSON when active note is absent from store", async () => {
    const flushed = JSON.stringify(buildPlaygroundContent("en"));
    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = [
      {
        id: "pg-zh",
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
        isPinned: false,
        modifiedAt: 200,
      },
    ];

    const result = await syncFormatPlaygroundOnLocaleChange("zh", flushed, {
      focusCanonical: true,
    });

    expect(setActiveNote).toHaveBeenCalledWith("pg-zh");
    expect(result.switchedFromNoteId).toBe("pg-en");
    expect(result.flushDropped).toBe(true);
  });

  it("does not switch focus when focusCanonical is false", async () => {
    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = duplicatePlaygroundPair();

    const result = await syncFormatPlaygroundOnLocaleChange("zh", null, {
      focusCanonical: false,
    });

    expect(setActiveNote).not.toHaveBeenCalled();
    expect(result.switchedFromNoteId).toBeNull();
  });

  it("reports flushDropped when flushed JSON is on the wrong duplicate", async () => {
    const flushed = JSON.stringify(buildPlaygroundContent("en"));
    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = duplicatePlaygroundPair();

    const result = await syncFormatPlaygroundOnLocaleChange("zh", flushed, {
      focusCanonical: true,
    });

    expect(result.flushDropped).toBe(true);
    expect(setActiveNote).toHaveBeenCalledWith("pg-zh");
  });

  it("applies clean-slate locale migration to canonical playground when flush is dropped", async () => {
    const enDoc = buildPlaygroundContent("en") as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    enDoc.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "locale-switch-pending-marker" }],
    });
    const flushed = JSON.stringify(enDoc);

    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = duplicatePlaygroundPair();

    await syncFormatPlaygroundOnLocaleChange("zh", flushed, {
      focusCanonical: true,
    });

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    expect(saveNoteContent).toHaveBeenCalledWith("pg-zh", expect.any(String));
    expect(saveNoteContent).not.toHaveBeenCalledWith(
      "pg-en",
      expect.anything(),
    );
    const saved = saveNoteContent.mock.calls[0][1] as string;
    expect(saved).toContain("格式试炼场");
    expect(saved).not.toContain("locale-switch-pending-marker");
  });

  it("skips flushApplied drift when canonical EN playground is already stored", async () => {
    const seed = JSON.stringify(buildPlaygroundContent("en"));
    const parsed = JSON.parse(seed) as {
      attrs?: Record<string, unknown>;
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.attrs = {
      ...parsed.attrs,
      playgroundContentVersion: PLAYGROUND_CONTENT_VERSION - 1,
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Lists",
    );
    parsed.content.splice(listsIndex + 2, 0, {
      type: "paragraph",
      content: [{ type: "text", text: "T6-MIXED-lists" }],
    });
    const polluted = JSON.stringify(parsed);

    mockNoteStoreState.activeNoteId = "pg-en";
    mockNoteStoreState.notes = [
      {
        id: "pg-en",
        title: "Format Playground",
        content: seed,
        isPinned: true,
        modifiedAt: 500,
      },
    ];

    await syncFormatPlaygroundOnLocaleChange("en", polluted, {
      focusCanonical: true,
    });

    expect(saveNoteContent).not.toHaveBeenCalled();
    expect(saveNoteContent.mock.calls.join("")).not.toContain("T6-MIXED-lists");
  });

  it("skips flushDropped polluted flush when canonical playground is already stored", async () => {
    const polluted = JSON.stringify({
      type: "doc",
      attrs: {
        playgroundContentVersion: 22,
        playgroundContentLocale: "en",
      },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "T5-MIXED-FOR" }],
        },
      ],
    });

    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [
      {
        id: "pg-en",
        title: "Format Playground",
        content: JSON.stringify(buildPlaygroundContent("en")),
        isPinned: true,
        modifiedAt: 500,
      },
    ];

    const result = await syncFormatPlaygroundOnLocaleChange("en", polluted, {
      focusCanonical: true,
    });

    expect(result.flushDropped).toBe(true);
    expect(saveNoteContent).not.toHaveBeenCalled();
  });

  it("does not switch focus when active note is not a playground", async () => {
    mockNoteStoreState.activeNoteId = "note-1";
    mockNoteStoreState.notes = [
      {
        id: "note-1",
        title: "Meeting Notes",
        content: '{"type":"doc","content":[]}',
      },
      ...duplicatePlaygroundPair(),
    ];

    const result = await syncFormatPlaygroundOnLocaleChange("zh", null, {
      focusCanonical: true,
    });

    expect(setActiveNote).not.toHaveBeenCalled();
    expect(result.switchedFromNoteId).toBeNull();
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
